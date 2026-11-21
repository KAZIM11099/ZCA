import { randomBytes } from 'node:crypto';
import { json, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { publishCustomerSessionRevoked } from '../services/sessionEvents.js';
import { allowRoles, requireAdmin, verifySameOrigin } from '../middleware/requireAdmin.js';
import { isValidDesignImageDataUrl, MAX_DESIGN_IMAGE_BYTES } from '../services/designImage.js';
import { escapeHtml, isMailerConfigured, sendEmail } from '../services/mailer.js';

const router = Router();
const adminJsonParser = json({ limit: '100kb' });
const adminImageJsonParser = json({ limit: '8mb' });
const adminCarouselJsonParser = json({ limit: '16mb' });
const productEditors = [allowRoles('SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER')];
const orderEditors = [allowRoles('SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER')];
const supportStaff = [allowRoles('SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'SUPPORT')];
const isTransientDatabaseError = (error) => error?.code === 'P1001' || error?.code === 'P2024';
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function notifyCustomerSessionRevoked(req, userId, reason) {
  try {
    publishCustomerSessionRevoked(userId, reason);
  } catch (error) {
    req.log?.warn({
      errorType: error.name,
      errorCode: error.code,
      userId,
    }, 'customer session revocation notification failed');
  }
}

async function withDatabaseRetry(operation, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientDatabaseError(error) || attempt === attempts) throw error;
      await wait(attempt * 500);
    }
  }
}

function generateProductSku() {
  return `ZKV-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
}
const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(100).optional(),
});

function productInclude() {
  return {
    category: { select: { id: true, name: true, slug: true } },
    variants: { orderBy: [{ color: 'asc' }, { size: 'asc' }] },
    images: { orderBy: { sortOrder: 'asc' } },
    collections: { include: { collection: { select: { id: true, slug: true, name: true } } } },
  };
}

function toProductDto(product) {
  return {
    ...product,
    category: product.category.slug,
    categoryName: product.category.name,
    collection: product.collections[0]?.collection.slug || null,
    collections: product.collections.map(({ collection }) => collection),
    image: product.images[0]?.storageKey || '',
    imageBack: product.images[0]?.storageKey || '',
    imageFront: product.images[1]?.storageKey || product.images[0]?.storageKey || '',
    colors: [...new Set(product.variants.map((variant) => variant.color))],
    sizes: [...new Set(product.variants.map((variant) => variant.size))],
  };
}

const variantSchema = z.object({
  sku: z.string().trim().min(2).max(191).optional(),
  size: z.string().trim().min(1).max(40),
  color: z.string().trim().min(1).max(60),
  stockQty: z.number().int().min(0).default(999999),
  lowStockAt: z.number().int().min(0).default(5),
  priceDeltaPaisa: z.number().int().default(0),
});

const productSchema = z.object({
  name: z.string().trim().min(2).max(191),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(191),
  sku: z.string().trim().min(2).max(191),
  description: z.string().max(10000).optional().nullable(),
  material: z.string().max(191).optional().nullable(),
  careInstructions: z.string().max(10000).optional().nullable(),
  basePricePaisa: z.number().int().positive().max(2147483647),
  salePricePaisa: z.number().int().positive().max(2147483647).optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'UNAVAILABLE']).default('DRAFT'),
  isMadeToOrder: z.boolean().default(false),
  isCustomizable: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  categoryId: z.number().int().positive(),
  image: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().max(7_000_000).refine((value) => {
      if (value.startsWith('data:image/')) return isValidDesignImageDataUrl(value);
      try {
        return new URL(value).protocol === 'https:';
      } catch {
        return false;
      }
    }, `Use a valid HTTPS image URL or PNG, JPEG, or WebP image no larger than ${MAX_DESIGN_IMAGE_BYTES / 1024 / 1024} MB.`).optional(),
  ),
  imageBack: z.string().max(7_000_000).refine(isValidDesignImageDataUrl, 'Choose a valid backside image up to 5 MB.').optional(),
  imageFront: z.string().max(7_000_000).refine(isValidDesignImageDataUrl, 'Choose a valid frontside image up to 5 MB.').optional(),
  variants: z.array(variantSchema).max(200).default([]),
  collectionIds: z.array(z.number().int().positive()).max(30).refine((ids) => new Set(ids).size === ids.length, 'Collections must be unique').default([]),
});
const customProductSchema = z.object({
  name: z.string().trim().min(2).max(191),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  garmentType: z.enum(['tshirt', 'drop-shoulder', 'hoodie', 'sweatshirt', 'long-sleeve']),
  description: z.string().trim().max(5000).optional().default(''),
  colors: z.array(z.object({
    name: z.string().trim().min(1).max(40),
    hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  })).min(1).max(30).refine(
    (colors) => new Set(colors.map(({ name }) => name.toLowerCase())).size === colors.length,
    'Color names must be unique.',
  ),
  basePricePaisa: z.number().int().positive().max(2147483647),
  isActive: z.boolean().default(true),
});

function customProductDto(product) {
  const fields = { ...product };
  delete fields.imageData;
  delete fields.imageMimeType;
  return fields;
}

async function audit(tx, req, action, targetType, targetId) {
  await tx.auditLog.create({
    data: { actorId: req.user.id, action, targetType, targetId: String(targetId) },
  });
}

router.use(requireAdmin, (req, res, next) => {
  if ((req.method === 'POST' && /^\/(?:hero-images|products|collections)$/.test(req.path))
    || (req.method === 'PATCH' && /^\/(?:products|collections)\/\d+$/.test(req.path))) {
    return adminImageJsonParser(req, res, next);
  }
  if ((req.method === 'POST' && req.path === '/carousel-images')
    || (req.method === 'PATCH' && /^\/carousel-images\/\d+$/.test(req.path))) {
    return adminCarouselJsonParser(req, res, next);
  }
  return adminJsonParser(req, res, next);
});

router.get('/system/client-ip', allowRoles('SUPER_ADMIN', 'ADMIN'), (req, res) => {
  res.json({ success: true, data: { clientIp: req.ip } });
});

router.get('/header-announcements', ...productEditors, async (req, res, next) => {
  try {
    const items = await prisma.headerAnnouncement.findMany({
      select: { id: true, text: true, sortOrder: true, createdAt: true },
      orderBy: { sortOrder: 'asc' },
      take: 1,
    });
    return res.json({ success: true, data: items });
  } catch (error) {
    return next(error);
  }
});

router.put('/header-announcements', ...productEditors, verifySameOrigin, async (req, res, next) => {
  const parsed = z.object({
    text: z.string().trim().min(1).max(250),
  }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Enter announcement text up to 250 characters.' } });
  }
  try {
    const item = await prisma.$transaction(async (tx) => {
      const currentItems = await tx.headerAnnouncement.findMany({
        select: { id: true },
        orderBy: { id: 'asc' },
      });
      const currentItem = currentItems[0];
      await tx.headerAnnouncement.deleteMany({
        where: currentItem ? { id: { not: currentItem.id } } : {},
      });
      const savedItem = currentItem
        ? await tx.headerAnnouncement.update({
          where: { id: currentItem.id },
          data: { text: parsed.data.text, sortOrder: 0 },
          select: { id: true, text: true, sortOrder: true, createdAt: true },
        })
        : await tx.headerAnnouncement.create({
          data: { text: parsed.data.text, sortOrder: 0 },
          select: { id: true, text: true, sortOrder: true, createdAt: true },
        });
      await audit(
        tx,
        req,
        currentItem ? 'header_announcement.updated' : 'header_announcement.created',
        'HeaderAnnouncement',
        savedItem.id,
      );
      return savedItem;
    });
    return res.json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.get('/hero-images', ...productEditors, async (req, res, next) => {
  try {
    const items = await prisma.heroImage.findMany({
      select: { id: true, mimeType: true, sortOrder: true, createdAt: true },
      orderBy: { sortOrder: 'asc' },
      take: 5,
    });
    return res.json({ success: true, data: items });
  } catch (error) {
    return next(error);
  }
});

router.post('/hero-images', ...productEditors, verifySameOrigin, async (req, res, next) => {
  const parsed = z.object({
    imageData: z.string().max(7_000_000).refine(
      isValidDesignImageDataUrl,
      'Choose a valid PNG, JPEG, or WebP hero image up to 5 MB.',
    ),
  }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Choose a valid hero image up to 5 MB.' } });
  }
  try {
    const dataUrlMatch = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(parsed.data.imageData);
    const item = await prisma.$transaction(async (tx) => {
      const currentImages = await tx.heroImage.findMany({
        select: { id: true, sortOrder: true },
        orderBy: { sortOrder: 'desc' },
        take: 5,
      });
      if (currentImages.length >= 5) {
        const error = new Error('You can upload a maximum of 5 hero images.');
        error.status = 409;
        throw error;
      }
      const created = await tx.heroImage.create({
        data: {
          imageData: Buffer.from(dataUrlMatch[2], 'base64'),
          mimeType: dataUrlMatch[1],
          sortOrder: (currentImages[0]?.sortOrder ?? -1) + 1,
        },
        select: { id: true, mimeType: true, sortOrder: true, createdAt: true },
      });
      await audit(tx, req, 'hero_image.created', 'HeroImage', created.id);
      return created;
    });
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return next(error);
  }
});

router.delete('/hero-images/:id', ...productEditors, verifySameOrigin, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ success: false, error: { message: 'Invalid hero image.' } });
  }
  try {
    await prisma.$transaction(async (tx) => {
      await tx.heroImage.delete({ where: { id } });
      await audit(tx, req, 'hero_image.deleted', 'HeroImage', id);
    });
    return res.json({ success: true, data: { id } });
  } catch (error) {
    return next(error);
  }
});

router.get('/dashboard', async (req, res, next) => {
  try {
    const [productCount, orderCount, customerCount, quoteCount, recentOrders, revenue] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.quote.count({ where: { status: { in: ['NEW', 'REVIEWING'] } } }),
      prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, orderNumber: true, email: true, status: true, totalPaisa: true, createdAt: true } }),
      prisma.order.aggregate({
        where: { status: { notIn: ['CANCELLED'] } },
        _sum: { totalPaisa: true },
      }),
    ]);
    res.json({
      success: true,
      data: {
        stats: {
          products: productCount,
          orders: orderCount,
          customers: customerCount,
          openQuotes: quoteCount,
          revenuePaisa: revenue._sum.totalPaisa || 0,
        },
        recentOrders,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/products', ...productEditors, async (req, res, next) => {
  const parsed = pageSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid pagination or search' } });
  const { page, pageSize, search } = parsed.data;
  const where = search ? { OR: [{ name: { contains: search } }, { sku: { contains: search } }] } : {};
  try {
    const [rows, total, categories, collections] = await Promise.all([
      prisma.product.findMany({ where, include: productInclude(), orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.product.count({ where }),
      prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.collection.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    ]);
    res.json({ success: true, data: { items: rows.map(toProductDto), page, pageSize, total, categories, collections } });
  } catch (error) {
    next(error);
  }
});

router.get('/custom-products', ...productEditors, async (req, res, next) => {
  const parsed = pageSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid pagination or search' } });
  const { page, pageSize } = parsed.data;
  try {
    const [items, total] = await Promise.all([
      prisma.customProduct.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.customProduct.count(),
    ]);
    res.json({ success: true, data: { items: items.map(customProductDto), page, pageSize, total } });
  } catch (error) {
    next(error);
  }
});

router.post('/custom-products', ...productEditors, verifySameOrigin, async (req, res, next) => {
  const parsed = customProductSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid custom product', details: parsed.error.flatten() } });
  try {
    const fields = parsed.data;
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.customProduct.create({
        data: {
          ...fields,
          sku: `CUSTOM-${fields.slug.toUpperCase()}`,
        },
      });
      await audit(tx, req, 'custom_product.created', 'CustomProduct', created.id);
      return created;
    });
    res.status(201).json({ success: true, data: customProductDto(item) });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ success: false, error: { message: 'A custom garment with this name or slug already exists.' } });
    next(error);
  }
});

router.patch('/custom-products/:id', ...productEditors, verifySameOrigin, async (req, res, next) => {
  const id = Number(req.params.id);
  const parsed = customProductSchema.safeParse(req.body);
  if (!Number.isSafeInteger(id) || id < 1 || !parsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Invalid custom product update.' } });
  }
  try {
    const fields = parsed.data;
    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.customProduct.update({
        where: { id },
        data: {
          ...fields,
          sku: `CUSTOM-${fields.slug.toUpperCase()}`,
        },
      });
      await audit(tx, req, 'custom_product.updated', 'CustomProduct', id);
      return updated;
    });
    res.json({ success: true, data: customProductDto(item) });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ success: false, error: { message: 'A custom garment with this name or slug already exists.' } });
    next(error);
  }
});

router.delete('/custom-products/:id', ...productEditors, verifySameOrigin, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ success: false, error: { message: 'Invalid custom product.' } });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.customProduct.delete({ where: { id } });
      await audit(tx, req, 'custom_product.deleted', 'CustomProduct', id);
    });
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    next(error);
  }
});

router.get('/reviews', ...productEditors, async (req, res, next) => {
  const parsed = pageSchema.extend({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  }).safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid pagination or search' } });
  const { page, pageSize, search, status } = parsed.data;
  const where = {
    ...(status ? { status } : {}),
    ...(search ? { OR: [
      { reviewerName: { contains: search } },
      { reviewerEmail: { contains: search } },
      { comment: { contains: search } },
      { product: { name: { contains: search } } },
    ] } : {}),
  };
  try {
    const [items, total, pendingCount] = await Promise.all([
      prisma.productReview.findMany({
        where,
        include: { product: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.productReview.count({ where }),
      prisma.productReview.count({ where: { status: 'PENDING' } }),
    ]);
    res.json({ success: true, data: { items, page, pageSize, total, pendingCount } });
  } catch (error) {
    next(error);
  }
});

router.patch('/reviews/:id', ...productEditors, verifySameOrigin, async (req, res, next) => {
  const id = Number(req.params.id);
  const parsed = z.object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']) }).safeParse(req.body);
  if (!Number.isSafeInteger(id) || id < 1 || !parsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Choose a valid review status.' } });
  }
  try {
    const review = await prisma.$transaction(async (tx) => {
      const updated = await tx.productReview.update({ where: { id }, data: { status: parsed.data.status } });
      await audit(tx, req, 'product_review.status_changed', 'ProductReview', id);
      return updated;
    });
    res.json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
});

router.post('/products', ...productEditors, verifySameOrigin, async (req, res, next) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid product', details: parsed.error.flatten() } });
  const { variants, image, imageBack, imageFront, collectionIds, ...fields } = parsed.data;
  const backImage = imageBack || image;
  const frontImage = imageFront || imageBack || image;
  if (!backImage || !frontImage) {
    return res.status(400).json({ success: false, error: { message: 'Add both backside and frontside product images.' } });
  }
  const sku = generateProductSku();
  if (fields.salePricePaisa != null && fields.salePricePaisa >= fields.basePricePaisa) {
    return res.status(400).json({ success: false, error: { message: 'Sale price must be lower than the regular price.' } });
  }
  if (!variants.length) return res.status(400).json({ success: false, error: { message: 'Add at least one product variant.' } });
  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...fields,
          sku,
          collections: collectionIds.length ? { create: collectionIds.map((collectionId, sortOrder) => ({ collectionId, sortOrder })) } : undefined,
          variants: variants.length ? { create: variants.map((variant) => ({ ...variant, sku: `${sku}-${variant.color.replace(/[^a-z0-9]/gi, '').toUpperCase()}-${variant.size}` })) } : undefined,
          images: backImage ? { create: [
            { storageKey: backImage, altText: `${fields.name} backside`, sortOrder: 0 },
            ...(frontImage ? [{ storageKey: frontImage, altText: `${fields.name} frontside`, sortOrder: 1 }] : []),
          ] } : undefined,
        },
        include: productInclude(),
      });
      await audit(tx, req, 'product.created', 'Product', created.id);
      return created;
    });
    res.status(201).json({ success: true, data: toProductDto(product) });
  } catch (error) {
    next(error);
  }
});

router.patch('/products/:id', ...productEditors, verifySameOrigin, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ success: false, error: { message: 'Invalid product id' } });
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid product', details: parsed.error.flatten() } });
  const { variants, image, imageBack, imageFront, collectionIds, ...fields } = parsed.data;
  try {
    const product = await prisma.$transaction(async (tx) => {
      const exists = await tx.product.findUnique({ where: { id } });
      if (!exists) return null;
      const nextBasePrice = fields.basePricePaisa ?? exists.basePricePaisa;
      const nextSalePrice = fields.salePricePaisa === undefined ? exists.salePricePaisa : fields.salePricePaisa;
      if (nextSalePrice != null && nextSalePrice >= nextBasePrice) {
        const error = new Error('Sale price must be lower than the regular price.');
        error.status = 400;
        throw error;
      }
      if (variants) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        if (variants.length) await tx.productVariant.createMany({ data: variants.map((variant) => ({ ...variant, sku: `${exists.sku}-${variant.color.replace(/[^a-z0-9]/gi, '').toUpperCase()}-${variant.size}`, productId: id })) });
      }
      if (collectionIds) {
        await tx.collectionProduct.deleteMany({ where: { productId: id } });
        if (collectionIds.length) await tx.collectionProduct.createMany({ data: collectionIds.map((collectionId, sortOrder) => ({ productId: id, collectionId, sortOrder })) });
      }
      if (image !== undefined || imageBack !== undefined || imageFront !== undefined) {
        const existingImages = await tx.productImage.findMany({ where: { productId: id }, orderBy: { sortOrder: 'asc' } });
        const nextBack = imageBack || image || existingImages[0]?.storageKey;
        const nextFront = imageFront || (imageBack ? imageBack : image) || existingImages[1]?.storageKey || nextBack;
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (nextBack) {
          await tx.productImage.createMany({ data: [
            { productId: id, storageKey: nextBack, altText: `${fields.name || exists.name} backside`, sortOrder: 0 },
            ...(nextFront ? [{ productId: id, storageKey: nextFront, altText: `${fields.name || exists.name} frontside`, sortOrder: 1 }] : []),
          ] });
        }
      }
      const updated = await tx.product.update({ where: { id }, data: fields, include: productInclude() });
      await audit(tx, req, 'product.updated', 'Product', id);
      return updated;
    });

    router.delete('/products/:id', ...productEditors, verifySameOrigin, async (req, res, next) => {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ success: false, error: { message: 'Invalid product id' } });
      try {
        await prisma.$transaction(async (tx) => {
          const product = await tx.product.findUnique({
            where: { id },
            select: { id: true, variants: { select: { id: true } } },
          });
          if (!product) {
            const error = new Error('Product not found');
            error.status = 404;
            throw error;
          }
          const variantIds = product.variants.map((variant) => variant.id);
          if (variantIds.length && await tx.orderItem.count({ where: { variantId: { in: variantIds } } })) {
            const error = new Error('This product is linked to an order and cannot be deleted. Unpublish it instead.');
            error.status = 409;
            throw error;
          }
          await tx.product.delete({ where: { id } });
          await audit(tx, req, 'product.deleted', 'Product', id);
        });
        return res.json({ success: true, data: { deleted: true } });
      } catch (error) {
        return next(error);
      }
    });
    if (!product) return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    res.json({ success: true, data: toProductDto(product) });
  } catch (error) {
    next(error);
  }
});

router.get('/categories', ...productEditors, async (req, res, next) => {
  const parsed = pageSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid pagination or search' } });
  const { page, pageSize } = parsed.data;
  try {
    const [rows, total] = await Promise.all([prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
      skip: (page - 1) * pageSize, take: pageSize,
    }), prisma.category.count()]);
    res.json({ success: true, data: { items: rows, page, pageSize, total } });
  } catch (error) {
    next(error);
  }
});

router.post('/categories', ...productEditors, verifySameOrigin, async (req, res, next) => {
  const parsed = z.object({
    name: z.string().trim().min(2).max(191),
    slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(191),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Enter a valid category name and slug' } });
  try {
    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.category.create({ data: parsed.data });
      await audit(tx, req, 'category.created', 'Category', created.id);
      return created;
    });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

router.patch('/categories/:id', ...productEditors, verifySameOrigin, async (req, res, next) => {
  const id = Number(req.params.id);
  const parsed = z.object({
    name: z.string().trim().min(2).max(191).optional(),
    slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(191).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  }).refine((value) => Object.keys(value).length > 0).safeParse(req.body);
  if (!Number.isSafeInteger(id) || id < 1 || !parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid category update' } });
  try {
    const category = await prisma.$transaction(async (tx) => {
      const updated = await tx.category.update({ where: { id }, data: parsed.data });
      await audit(tx, req, 'category.updated', 'Category', id);
      return updated;
    });
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

router.get('/collections', ...productEditors, async (req, res, next) => {
  try {
    const [items, products, carouselImages, categories, carouselCounts] = await Promise.all([
      prisma.collection.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          isActive: true,
          bannerImageMimeType: true,
          items: { select: { productId: true } },
          _count: { select: { items: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.product.findMany({
        select: { id: true, name: true, sku: true, status: true },
        orderBy: { name: 'asc' },
        take: 500,
      }),
      prisma.carouselImage.findMany({
        include: {
          collection: { select: { id: true, name: true, slug: true } },
          category: { select: { id: true, name: true, slug: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.carouselImage.groupBy({ by: ['collectionId'], _count: { _all: true } }),
    ]);
    const carouselCountByCollection = Object.fromEntries(carouselCounts.map(({ collectionId, _count }) => [collectionId, _count._all]));
    res.json({ success: true, data: { items, products, carouselImages, categories, carouselCountByCollection, carouselLimit: 10 } });
  } catch (error) {
    next(error);
  }
});

const collectionSchema = z.object({
  name: z.string().trim().min(2).max(191),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(191),
  description: z.string().trim().max(2000).nullable().optional(),
  bannerImageData: z.string().max(7_000_000).refine(
    isValidDesignImageDataUrl,
    'Choose a valid PNG, JPEG, or WebP collection banner up to 5 MB.',
  ).nullable().optional(),
  isActive: z.boolean().default(true),
  productIds: z.array(z.number().int().positive()).max(500).refine((ids) => new Set(ids).size === ids.length, 'Products must be unique').default([]),
});
function collectionBannerFields(imageData) {
  if (imageData === null) return { bannerImageData: null, bannerImageMimeType: null };
  if (!imageData) return {};
  const [, mimeType, encoded] = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(imageData);
  return {
    bannerImageData: Buffer.from(encoded, 'base64'),
    bannerImageMimeType: mimeType,
  };
}
const carouselImageSchema = z.object({
  collectionId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  productId: z.number().int().positive(),
  modelImage: z.string().max(7_000_000).refine(isValidDesignImageDataUrl, 'Choose a valid PNG, JPEG, or WebP model image up to 5 MB.'),
  productImage: z.string().max(7_000_000).refine(isValidDesignImageDataUrl, 'Choose a valid PNG, JPEG, or WebP product image up to 5 MB.'),
  description: z.string().trim().min(1).max(50),
});

router.post('/collections', ...productEditors, verifySameOrigin, async (req, res, next) => {
  const parsed = collectionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Enter a collection name and a lowercase, hyphenated URL slug.' } });
  try {
    const collection = await prisma.$transaction(async (tx) => {
      const { productIds, bannerImageData, ...fields } = parsed.data;
      if (productIds.length) {
        const count = await tx.product.count({ where: { id: { in: productIds } } });
        if (count !== new Set(productIds).size) {
          const error = new Error('One or more selected products could not be found.');
          error.status = 400;
          throw error;
        }
      }
      const created = await tx.collection.create({
        data: {
          ...fields,
          ...collectionBannerFields(bannerImageData),
          items: productIds.length ? { create: productIds.map((productId, sortOrder) => ({ productId, sortOrder })) } : undefined,
        },
      });
      await audit(tx, req, 'collection.created', 'Collection', created.id);
      return created;
    });
    res.status(201).json({ success: true, data: collection });
  } catch (error) {
    next(error);
  }
});

router.patch('/collections/:id', ...productEditors, verifySameOrigin, async (req, res, next) => {
  const id = Number(req.params.id);
  const parsed = collectionSchema.partial().safeParse(req.body);
  if (!Number.isSafeInteger(id) || id < 1 || !parsed.success || !Object.keys(parsed.data).length) {
    return res.status(400).json({ success: false, error: { message: 'Enter valid collection details.' } });
  }
  try {
    const collection = await prisma.$transaction(async (tx) => {
      const { productIds, bannerImageData, ...fields } = parsed.data;
      if (productIds) {
        const count = await tx.product.count({ where: { id: { in: productIds } } });
        if (count !== new Set(productIds).size) {
          const error = new Error('One or more selected products could not be found.');
          error.status = 400;
          throw error;
        }
        await tx.collectionProduct.deleteMany({ where: { collectionId: id } });
        if (productIds.length) {
          await tx.collectionProduct.createMany({
            data: productIds.map((productId, sortOrder) => ({ collectionId: id, productId, sortOrder })),
          });

        }
      }
      const updated = await tx.collection.update({
        where: { id },
        data: { ...fields, ...collectionBannerFields(bannerImageData) },
      });
      await audit(tx, req, 'collection.updated', 'Collection', id);
      return updated;
    });
    res.json({ success: true, data: collection });
  } catch (error) {
    next(error);
  }
});

router.get('/carousel-images', ...productEditors, async (req, res, next) => {
  try {
    const [items, collections, categories, total] = await Promise.all([
      prisma.carouselImage.findMany({
        include: {
          collection: { select: { id: true, name: true, slug: true } },
          category: { select: { id: true, name: true, slug: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.collection.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.carouselImage.count(),
    ]);
    res.json({ success: true, data: { items, collections, categories, total, limit: 10 } });
  } catch (error) {
    next(error);
  }
});

router.post('/carousel-images', ...productEditors, verifySameOrigin, async (req, res, next) => {
  const parsed = carouselImageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Complete both carousel image forms with valid details.' } });
  try {
    const item = await withDatabaseRetry(() => prisma.$transaction(async (tx) => {
      const count = await tx.carouselImage.count({ where: { collectionId: parsed.data.collectionId } });
      if (count >= 10) {
        const error = new Error('You can create a maximum of 10 carousel images.');
        error.status = 409;
        throw error;
      }
      const [collection, category, product] = await Promise.all([
        tx.collection.findUnique({ where: { id: parsed.data.collectionId }, select: { id: true } }),
        tx.category.findUnique({ where: { id: parsed.data.categoryId }, select: { id: true } }),
        tx.product.findUnique({ where: { id: parsed.data.productId }, select: { id: true } }),
      ]);
      if (!collection || !category || !product) {
        const error = new Error('Selected collection, category, or product could not be found.');
        error.status = 400;
        throw error;
      }
      const created = await tx.carouselImage.create({ data: parsed.data });
      await audit(tx, req, 'carousel_image.created', 'CarouselImage', created.id);
      return created;
    }, { maxWait: 10000, timeout: 15000 }));
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

router.patch('/carousel-images/:id', ...productEditors, verifySameOrigin, async (req, res, next) => {
  const id = Number(req.params.id);
  const parsed = carouselImageSchema.partial().safeParse(req.body);
  if (!Number.isSafeInteger(id) || id < 1 || !parsed.success || !Object.keys(parsed.data).length) {
    return res.status(400).json({ success: false, error: { message: 'Complete the carousel image details.' } });
  }
  try {
    const item = await prisma.$transaction(async (tx) => {
      if (parsed.data.collectionId) {
        const collection = await tx.collection.findUnique({ where: { id: parsed.data.collectionId }, select: { id: true } });
        if (!collection) {
          const error = new Error('Selected collection could not be found.');
          error.status = 400;
          throw error;
        }
      }
      if (parsed.data.categoryId) {
        const category = await tx.category.findUnique({ where: { id: parsed.data.categoryId }, select: { id: true } });
        if (!category) {
          const error = new Error('Selected category could not be found.');
          error.status = 400;
          throw error;
        }
      }
      if (parsed.data.productId) {
        const product = await tx.product.findUnique({ where: { id: parsed.data.productId }, select: { id: true } });
        if (!product) {
          const error = new Error('Selected product could not be found.');
          error.status = 400;
          throw error;
        }
      }
      const updated = await tx.carouselImage.update({ where: { id }, data: parsed.data });
      await audit(tx, req, 'carousel_image.updated', 'CarouselImage', id);
      return updated;
    });
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

router.delete('/carousel-images/:id', ...productEditors, verifySameOrigin, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ success: false, error: { message: 'Invalid carousel image.' } });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.carouselImage.delete({ where: { id } });
      await audit(tx, req, 'carousel_image.deleted', 'CarouselImage', id);
    });
    res.json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

router.get('/orders', ...orderEditors, async (req, res, next) => {
  const parsed = pageSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid pagination or search' } });
  const { page, pageSize, search } = parsed.data;
  const where = search ? { OR: [{ orderNumber: { contains: search } }, { email: { contains: search } }] } : {};
  try {
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              design: true,
              variant: { include: { product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } } } },
            },
          },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);
    res.json({ success: true, data: { items, page, pageSize, total } });
  } catch (error) {
    next(error);
  }
});

router.get('/custom-designs', ...productEditors, async (req, res, next) => {
  try {
    const designs = await prisma.customDesign.findMany({
      include: {
        product: { select: { name: true, sku: true } },
        customProduct: { select: { name: true, sku: true, garmentType: true } },
        user: { select: { email: true, fullName: true } },
        orderItems: { select: { order: { select: { orderNumber: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: designs });
  } catch (error) {
    next(error);
  }
});

router.patch('/custom-designs/:id', ...productEditors, verifySameOrigin, async (req, res, next) => {
  const id = Number(req.params.id);
  const parsed = z.object({
    status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED', 'REJECTED']),
  }).safeParse(req.body);
  if (!Number.isSafeInteger(id) || id < 1 || !parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid design update' } });
  try {
    const design = await prisma.$transaction(async (tx) => {
      const updated = await tx.customDesign.update({ where: { id }, data: { status: parsed.data.status } });
      await audit(tx, req, 'custom_design.status_changed', 'CustomDesign', id);
      return updated;
    });
    res.json({ success: true, data: design });
  } catch (error) {
    next(error);
  }
});

router.patch('/orders/:id', ...orderEditors, verifySameOrigin, async (req, res, next) => {
  const id = Number(req.params.id);
  const parsed = z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  }).safeParse(req.body);
  if (!Number.isSafeInteger(id) || id < 1 || !parsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Invalid order update' } });
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id }, include: { items: true } });
      if (!existing) return null;
      const allowedStatuses = ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
      if (existing.status !== parsed.data.status && !allowedStatuses.includes(parsed.data.status)) {
        const error = new Error(`Invalid order status: ${parsed.data.status}.`);
        error.status = 400;
        throw error;
      }
      if (existing.status !== 'CANCELLED' && parsed.data.status === 'CANCELLED') {
        for (const item of existing.items) {
          if (!item.variantId) continue;
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            include: { product: { select: { isMadeToOrder: true } } },
          });
          if (variant && !variant.product.isMadeToOrder) {
            await tx.productVariant.update({ where: { id: variant.id }, data: { stockQty: { increment: item.qty } } });
            await tx.inventoryMovement.create({
              data: {
                variantId: variant.id,
                actorId: req.user.id,
                quantityChange: item.qty,
                reason: `Cancelled order ${existing.orderNumber}`,
              },
            });
          }
        }
      }
      const updated = await tx.order.update({ where: { id }, data: { status: parsed.data.status } });
      if (parsed.data.status === 'DELIVERED') {
        await tx.payment.updateMany({ where: { orderId: id, method: 'COD' }, data: { status: 'PAID' } });
      } else if (parsed.data.status === 'CANCELLED') {
        await tx.payment.updateMany({ where: { orderId: id, status: 'PENDING' }, data: { status: 'FAILED' } });
      }
      await audit(tx, req, 'order.status_changed', 'Order', id);
      return {
        order: updated,
        shouldSendShippedEmail: existing.status !== 'SHIPPED' && updated.status === 'SHIPPED',
        customerEmail: existing.email,
        customerPhone: existing.phone,
        shippingAddress: existing.shippingAddress,
        items: existing.items,
      };
    });
    if (!result) return res.status(404).json({ success: false, error: { message: 'Order not found' } });

    if (result.shouldSendShippedEmail && isMailerConfigured()) {
      try {
        const address = result.shippingAddress && typeof result.shippingAddress === 'object'
          ? result.shippingAddress
          : {};
        const customerName = typeof address.name === 'string' ? address.name : 'there';
        const itemText = result.items.map((item) => (
          `${item.nameSnapshot} — Qty ${item.qty}, ${item.color}, size ${item.size}`
        )).join('\n');
        const itemHtml = result.items.map((item) => (
          `<li>${escapeHtml(item.nameSnapshot)} — Qty ${item.qty}, ${escapeHtml(item.color)}, size ${escapeHtml(item.size)}</li>`
        )).join('');
        const safeAddress = [
          address.line1,
          address.line2,
          address.city,
          address.province,
          address.postalCode,
          address.country,
        ].filter((line) => typeof line === 'string' && line.trim()).map(escapeHtml).join('<br>');

        await sendEmail({
          to: result.customerEmail,
          subject: `Your order ${result.order.orderNumber} has shipped | ZAVIKOO`,
          text: `Hi ${customerName},\n\nYour order ${result.order.orderNumber} has shipped.\n\n${itemText}\n\nPlease keep your phone (${result.customerPhone}) active and available so the delivery rider can contact you.\n\nDelivery address:\n${[
            address.line1,
            address.line2,
            address.city,
            address.province,
            address.postalCode,
            address.country,
          ].filter((line) => typeof line === 'string' && line.trim()).join('\n')}\n\nThank you for shopping with ZAVIKOO Custom Atelier.`,
          html: `<p>Hi ${escapeHtml(customerName)},</p>
            <p>Your order <strong>${escapeHtml(result.order.orderNumber)}</strong> has shipped.</p>
            <p><strong>Order details</strong></p>
            <ul>${itemHtml}</ul>
            <p>Please keep your phone number <strong>${escapeHtml(result.customerPhone)}</strong> active and available so the delivery rider can contact you.</p>
            ${safeAddress ? `<p><strong>Delivery address</strong><br>${safeAddress}</p>` : ''}
            <p>Thank you for shopping with ZAVIKOO Custom Atelier.</p>`,
        });
      } catch (emailError) {
        console.error('Shipped order notification email failed:', emailError.message);
      }
    }

    res.json({ success: true, data: result.order });
  } catch (error) {
    next(error);
  }
});

router.get('/customers', ...supportStaff, async (req, res, next) => {
  const parsed = pageSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid pagination or search' } });
  const { page, pageSize, search } = parsed.data;
  const where = {
    role: 'CUSTOMER',
    ...(search ? { OR: [{ email: { contains: search } }, { fullName: { contains: search } }] } : {}),
  };
  try {
    const [items, total] = await Promise.all([
      prisma.user.findMany({ where, select: { id: true, email: true, fullName: true, phone: true, isActive: true, createdAt: true, _count: { select: { orders: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.user.count({ where }),
    ]);
    res.json({ success: true, data: { items, page, pageSize, total } });
  } catch (error) {
    next(error);
  }
});

router.patch('/customers/:id', ...supportStaff, verifySameOrigin, async (req, res, next) => {
  const id = Number(req.params.id);
  const parsed = z.object({ isActive: z.boolean() }).safeParse(req.body);
  if (!Number.isSafeInteger(id) || id < 1 || !parsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Invalid customer status update.' } });
  }
  try {
    const customer = await prisma.$transaction(async (tx) => {
      const current = await tx.user.findFirst({ where: { id, role: 'CUSTOMER' }, select: { id: true } });
      if (!current) return null;
      const updated = await tx.user.update({ where: { id }, data: { isActive: parsed.data.isActive }, select: { id: true, isActive: true } });
      if (!parsed.data.isActive) {
        await tx.session.deleteMany({ where: { userId: id } });
      }
      await audit(tx, req, parsed.data.isActive ? 'customer.unblocked' : 'customer.blocked', 'User', id);
      return updated;
    });
    if (!customer) return res.status(404).json({ success: false, error: { message: 'Customer not found.' } });
    if (!customer.isActive) notifyCustomerSessionRevoked(req, customer.id);
    return res.json({ success: true, data: customer });
  } catch (error) {
    return next(error);
  }
});

router.get('/customers/:id/deletion-summary', ...supportStaff, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ success: false, error: { message: 'Invalid customer id.' } });
  try {
    const customer = await prisma.user.findFirst({
      where: { id, role: 'CUSTOMER' },
      select: { id: true, fullName: true, email: true },
    });
    if (!customer) return res.status(404).json({ success: false, error: { message: 'Customer not found.' } });
    const orders = await prisma.order.findMany({
      where: { OR: [{ userId: id }, { email: customer.email }] },
      select: {
        orderNumber: true,
        status: true,
        createdAt: true,
        totalPaisa: true,
        items: { select: { nameSnapshot: true, qty: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: { ...customer, orders } });
  } catch (error) {
    return next(error);
  }
});

router.delete('/customers/:id', ...supportStaff, verifySameOrigin, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ success: false, error: { message: 'Invalid customer id.' } });
  const parsed = z.object({
    confirmedOrderNumbers: z.array(z.string().trim().min(1).max(191)).max(5000).default([]),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid customer deletion confirmation.' } });
  try {
    const deleted = await prisma.$transaction(async (tx) => {
      const customer = await tx.user.findFirst({ where: { id, role: 'CUSTOMER' }, select: { id: true, email: true } });
      if (!customer) return null;
      const orderWhere = { OR: [{ userId: id }, { email: customer.email }] };
      const orders = await tx.order.findMany({
        where: orderWhere,
        select: { id: true, orderNumber: true },
        orderBy: { orderNumber: 'asc' },
      });
      const confirmedOrderNumbers = [...parsed.data.confirmedOrderNumbers].sort();
      const orderNumbersMatch = orders.length === confirmedOrderNumbers.length
        && orders.every((order, index) => order.orderNumber === confirmedOrderNumbers[index]);
      if (!orderNumbersMatch) {
        return { needsRefresh: true, orderCount: orders.length };
      }

      const orderIds = orders.map((order) => order.id);
      const orderDesigns = orderIds.length
        ? await tx.orderItem.findMany({ where: { orderId: { in: orderIds }, designId: { not: null } }, select: { designId: true } })
        : [];
      const orderDesignIds = orderDesigns.map((item) => item.designId);
      await tx.shipment.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      await tx.customDesign.deleteMany({
        where: {
          OR: [
            { userId: id },
            { id: { in: orderDesignIds } },
          ],
        },
      });
      await tx.quote.deleteMany({ where: { OR: [{ userId: id }, { email: customer.email }] } });
      await tx.contactMessage.deleteMany({ where: { email: customer.email } });
      await tx.productReview.deleteMany({ where: { reviewerEmail: customer.email } });
      await tx.newsletterSubscriber.deleteMany({ where: { email: customer.email } });
      await tx.inventoryMovement.deleteMany({ where: { actorId: id } });
      await tx.auditLog.deleteMany({
        where: {
          OR: [
            { actorId: id },
            { targetType: 'User', targetId: String(id) },
          ],
        },
      });
      await tx.user.delete({ where: { id } });
      await audit(tx, req, 'customer.deleted', 'User', id);
      return { needsRefresh: false, orderCount: orderIds.length };
    }, { maxWait: 10000, timeout: 30000 });
    if (!deleted) return res.status(404).json({ success: false, error: { message: 'Customer not found.' } });
    if (deleted.needsRefresh) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'The customer’s orders changed since you opened this dialog. Close it and review the updated order list before deleting.',
          orderCount: deleted.orderCount,
        },
      });
    }
    notifyCustomerSessionRevoked(req, id, 'account-deleted');
    return res.json({ success: true, data: { deleted: true, orderCount: deleted.orderCount } });
  } catch (error) {
    return next(error);
  }
});

router.get('/quotes', ...supportStaff, async (req, res, next) => {
  const parsed = pageSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid pagination or search' } });
  const { page, pageSize } = parsed.data;
  try {
    const [quotes, total] = await Promise.all([prisma.quote.findMany({
      include: { designImage: { select: { id: true, mimeType: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize, take: pageSize,
    }), prisma.quote.count()]);
    res.json({ success: true, data: { items: quotes, page, pageSize, total } });
  } catch (error) {
    next(error);
  }
});

router.get('/quotes/:id/design-image', ...supportStaff, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ success: false, error: { message: 'Invalid quote id' } });
  try {
    const image = await prisma.quoteDesignImage.findUnique({
      where: { quoteId: id },
      select: { imageData: true, mimeType: true },
    });
    if (!image) return res.status(404).json({ success: false, error: { message: 'Design image not found' } });
    res.set({
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `inline; filename="quote-${id}-design.${image.mimeType === 'image/png' ? 'png' : image.mimeType === 'image/webp' ? 'webp' : 'jpg'}"`,
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.type(image.mimeType).send(image.imageData);
  } catch (error) {
    return next(error);
  }
});

router.patch('/quotes/:id', ...supportStaff, verifySameOrigin, async (req, res, next) => {
  const id = Number(req.params.id);
  const parsed = z.object({
    status: z.enum(['NEW', 'REVIEWING', 'QUOTED', 'ACCEPTED', 'DECLINED', 'COMPLETED']).optional(),
    quotedPricePaisa: z.number().int().positive().nullable().optional(),
    internalNotes: z.string().max(10000).nullable().optional(),
  }).refine((value) => Object.keys(value).length > 0).safeParse(req.body);
  if (!Number.isSafeInteger(id) || id < 1 || !parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid quote update' } });
  try {
    const quote = await prisma.$transaction(async (tx) => {
      const updated = await tx.quote.update({ where: { id }, data: parsed.data });
      await audit(tx, req, 'quote.updated', 'Quote', id);
      return updated;
    });
    res.json({ success: true, data: quote });
  } catch (error) {
    next(error);
  }
});

router.post('/quotes/:id/reply', ...supportStaff, verifySameOrigin, async (req, res, next) => {
  const id = Number(req.params.id);
  const parsed = z.object({
    subject: z.string().trim().min(1).max(191),
    message: z.string().trim().min(1).max(20000),
  }).safeParse(req.body);
  if (!Number.isSafeInteger(id) || id < 1 || !parsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Enter a subject and message for the reply.' } });
  }
  if (!isMailerConfigured()) {
    return res.status(503).json({ success: false, error: { message: 'Email service is not configured.' } });
  }
  try {
    const quote = await prisma.quote.findUnique({ where: { id }, select: { id: true, name: true, email: true } });
    if (!quote) return res.status(404).json({ success: false, error: { message: 'Quote request not found.' } });
    await sendEmail({
      to: quote.email,
      subject: parsed.data.subject,
      text: `Hi ${quote.name},\n\n${parsed.data.message}\n\nZAVIKOO Custom Atelier`,
      html: `<p>Hi ${escapeHtml(quote.name)},</p><p>${escapeHtml(parsed.data.message).replace(/\r?\n/g, '<br>')}</p><p>ZAVIKOO Custom Atelier</p>`,
    });
    await audit(prisma, req, 'quote.reply_sent', 'Quote', id);
    return res.json({ success: true, data: { sent: true } });
  } catch (error) {
    console.error('Quote reply email failed:', error.message);
    return next(error);
  }
});

router.get('/contact-messages', ...supportStaff, async (req, res, next) => {
  const parsed = pageSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid pagination or search' } });
  const { page, pageSize, search } = parsed.data;
  const where = search ? {
    OR: [
      { name: { contains: search } },
      { email: { contains: search } },
      { subject: { contains: search } },
      { message: { contains: search } },
    ],
  } : {};
  try {
    const [items, total, unreadCount] = await Promise.all([
      prisma.contactMessage.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.contactMessage.count({ where }),
      prisma.contactMessage.count({ where: { status: 'NEW' } }),
    ]);
    return res.json({ success: true, data: { items, page, pageSize, total, unreadCount } });
  } catch (error) {
    return next(error);
  }
});

router.patch('/contact-messages/:id', ...supportStaff, verifySameOrigin, async (req, res, next) => {
  const id = z.coerce.number().int().positive().safeParse(req.params.id);
  const parsed = z.object({
    status: z.enum(['NEW', 'READ', 'REPLIED', 'ARCHIVED']),
  }).safeParse(req.body);
  if (!id.success || !parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid contact message update.' } });
  try {
    const contactMessage = await prisma.$transaction(async (tx) => {
      const updated = await tx.contactMessage.update({ where: { id: id.data }, data: { status: parsed.data.status } });
      await audit(tx, req, 'contact_message.status_changed', 'ContactMessage', id.data);
      return updated;
    });
    return res.json({ success: true, data: contactMessage });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, error: { message: 'Contact message not found.' } });
    return next(error);
  }
});

router.get('/newsletter-subscribers', ...supportStaff, async (req, res, next) => {
  const parsed = pageSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid pagination or search' } });
  const { page, pageSize, search } = parsed.data;
  const where = search ? { email: { contains: search } } : {};
  try {
    const [items, total] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.newsletterSubscriber.count({ where }),
    ]);
    return res.json({ success: true, data: { items, page, pageSize, total } });
  } catch (error) {
    return next(error);
  }
});

router.get('/audit-logs', requireAdmin, async (req, res, next) => {
  const parsed = pageSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid pagination or search' } });
  const { page, pageSize } = parsed.data;
  try {
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: { actor: { select: { email: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count(),
    ]);
    res.json({ success: true, data: { items, page, pageSize, total } });
  } catch (error) {
    next(error);
  }
});

export default router;
