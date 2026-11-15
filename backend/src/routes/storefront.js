import { createHash, randomBytes } from 'node:crypto';
import { json, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireCustomer } from '../middleware/requireCustomer.js';
import { verifySameOrigin } from '../middleware/requireAdmin.js';
import { escapeHtml, isMailerConfigured, sendEmail } from '../services/mailer.js';
import { isValidDesignImageDataUrl, MAX_DESIGN_IMAGE_BYTES } from '../services/designImage.js';
import { createEmailRateLimiter, createFieldRateLimiter, createRateLimiter } from '../services/rateLimiters.js';

const router = Router();
const quoteJsonParser = json({ limit: '6mb' });
const checkoutJsonParser = json({ limit: '8mb' });
const publicCatalogLimiter = createRateLimiter('public-catalog-get', {
  windowMs: 60 * 1000,
  limit: 120,
});
router.use((req, res, next) => req.method === 'GET'
  ? publicCatalogLimiter(req, res, next)
  : next());

const reviewLimiter = createRateLimiter('product-review-write', {
  windowMs: 24 * 60 * 60 * 1000,
  limit: 3,
});
const reviewEmailLimiter = createEmailRateLimiter('product-review-email', {
  windowMs: 24 * 60 * 60 * 1000,
  limit: 3,
});

function productInclude() {
  return {
    category: { select: { name: true, slug: true } },
    variants: { orderBy: [{ color: 'asc' }, { size: 'asc' }] },
    images: { orderBy: { sortOrder: 'asc' } },
    collections: { include: { collection: { select: { slug: true, name: true } } } },
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

router.get('/header-announcements', async (req, res, next) => {
  try {
    const announcements = await prisma.headerAnnouncement.findMany({
      select: { id: true, text: true, sortOrder: true },
      orderBy: { sortOrder: 'asc' },
      take: 1,
    });
    return res.json({ success: true, data: announcements });
  } catch (error) {
    return next(error);
  }
});

router.get('/hero-images', async (req, res, next) => {
  try {
    const images = await prisma.heroImage.findMany({
      select: { id: true },
      orderBy: { sortOrder: 'asc' },
      take: 5,
    });
    return res.json({
      success: true,
      data: images.map(({ id }) => ({ id, src: `/hero-images/${id}/image` })),
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/hero-images/:id/image', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ success: false, error: { message: 'Invalid hero image.' } });
  }
  try {
    const image = await prisma.heroImage.findUnique({
      where: { id },
      select: { imageData: true, mimeType: true },
    });
    if (!image) return res.status(404).json({ success: false, error: { message: 'Hero image not found.' } });
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.type(image.mimeType).send(image.imageData);
  } catch (error) {
    return next(error);
  }
});

router.get('/products', async (req, res, next) => {
  const parsed = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(48).default(24),
    search: z.string().trim().max(100).optional(),
    category: z.string().trim().max(191).optional(),
    collection: z.string().trim().max(191).optional(),
    featured: z.enum(['true', 'false']).optional(),
    sort: z.enum(['featured', 'newest', 'price-asc', 'price-desc', 'name']).default('featured'),
  }).safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid product filters' } });

  const { page, pageSize, search, category, collection, featured, sort } = parsed.data;
  const where = {
    status: 'PUBLISHED',
    ...(category ? { category: { slug: category, isActive: true } } : {}),
    ...(collection ? { collections: { some: { collection: { slug: collection, isActive: true } } } } : {}),
    ...(featured === 'true' ? { isFeatured: true } : {}),
    ...(search ? { OR: [{ name: { contains: search } }, { description: { contains: search } }, { sku: { contains: search } }] } : {}),
  };
  const orderBy = {
    featured: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    newest: [{ createdAt: 'desc' }],
    'price-asc': [{ salePricePaisa: 'asc' }, { basePricePaisa: 'asc' }],
    'price-desc': [{ salePricePaisa: 'desc' }, { basePricePaisa: 'desc' }],
    name: [{ name: 'asc' }],
  }[sort];

  try {
    const [items, total] = await Promise.all([
      prisma.product.findMany({ where, include: productInclude(), orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.product.count({ where }),
    ]);
    return res.json({ success: true, data: { items: items.map(toProductDto), page, pageSize, total } });
  } catch (error) {
    return next(error);
  }
});

router.get('/collections', async (req, res, next) => {
  try {
    const collections = await prisma.collection.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        bannerImageMimeType: true,
        _count: { select: { items: true } },
      },
      orderBy: { name: 'asc' },
    });

    return res.json({
      success: true,
      data: collections.map(({ id, bannerImageMimeType, ...collection }) => ({
        id,
        ...collection,
        bannerImageUrl: bannerImageMimeType ? `/collections/${id}/banner-image` : null,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/collections/:id/banner-image', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ success: false, error: { message: 'Invalid collection banner.' } });
  }
  try {
    const collection = await prisma.collection.findFirst({
      where: { id, isActive: true },
      select: { bannerImageData: true, bannerImageMimeType: true },
    });
    if (!collection?.bannerImageData || !collection.bannerImageMimeType) {
      return res.status(404).json({ success: false, error: { message: 'Collection banner not found.' } });
    }
    res.set({
      'Cache-Control': 'no-store',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.type(collection.bannerImageMimeType).send(collection.bannerImageData);
  } catch (error) {
    return next(error);
  }
});

router.get('/carousel-images', async (req, res, next) => {
  const parsed = z.object({
    collection: z.string().trim().max(191).optional(),
  }).safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid carousel collection.' } });
  try {
    const items = await prisma.carouselImage.findMany({
      where: {
        collection: parsed.data.collection ? { slug: parsed.data.collection, isActive: true } : { isActive: true },
      },
      include: {
        category: { select: { name: true, slug: true } },
        collection: { select: { name: true, slug: true } },
        product: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });
    return res.json({
      success: true,
      data: items.map((item) => ({
        id: item.id,
        modelImage: item.modelImage,
        productImage: item.productImage,
        productId: item.productId,
        product: item.product,
        title: item.description,
        detail: item.category.name,
        collection: item.collection,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/categories', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true },
    });
    return res.json({ success: true, data: categories });
  } catch (error) {
    return next(error);
  }
});

router.get('/custom-products', async (req, res, next) => {
  try {
    const products = await prisma.customProduct.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, sku: true, garmentType: true, description: true, basePricePaisa: true },
      orderBy: [{ createdAt: 'asc' }],
    });
    return res.json({ success: true, data: products });
  } catch (error) {
    return next(error);
  }
});

router.get('/products/:slug', async (req, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED' },
      include: productInclude(),
    });
    if (!product) return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    return res.json({ success: true, data: toProductDto(product) });
  } catch (error) {
    return next(error);
  }
});

router.get('/reviews', async (req, res, next) => {
  try {
    const reviews = await prisma.productReview.findMany({
      where: { status: 'APPROVED' },
      include: { product: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
    return res.json({
      success: true,
      data: reviews.map(({ reviewerEmail, ...review }) => review),
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/products/:slug/reviews', async (req, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!product) return res.status(404).json({ success: false, error: { message: 'Product not found' } });

    const [items, summary] = await Promise.all([
      prisma.productReview.findMany({
        where: { productId: product.id, status: 'APPROVED' },
        select: { id: true, reviewerName: true, rating: true, comment: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.productReview.aggregate({
        where: { productId: product.id, status: 'APPROVED' },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);
    return res.json({
      success: true,
      data: {
        items,
        summary: { count: summary._count._all, averageRating: summary._avg.rating || 0 },
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/products/:slug/reviews', reviewLimiter, reviewEmailLimiter, async (req, res, next) => {
  const parsed = z.object({
    reviewerName: z.string().trim().min(2).max(100),
    reviewerEmail: z.string().trim().email().max(191),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(5).max(3000),
  }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Enter your name, a valid email, a 1–5 star rating, and a review of at least 5 characters.' } });
  }

  try {
    const product = await prisma.product.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!product) return res.status(404).json({ success: false, error: { message: 'Product not found' } });

    const review = await prisma.productReview.create({
      data: {
        productId: product.id,
        ...parsed.data,
        reviewerEmail: parsed.data.reviewerEmail.toLowerCase(),
      },
      select: { id: true, status: true, createdAt: true },
    });
    return res.status(201).json({
      success: true,
      data: { reviewId: review.id, status: review.status, createdAt: review.createdAt },
    });
  } catch (error) {
    return next(error);
  }
});

const quoteLimiter = createRateLimiter('quote-write', {
  windowMs: 60 * 60 * 1000,
  limit: 5,
});
const quoteEmailLimiter = createEmailRateLimiter('quote-email', {
  windowMs: 60 * 60 * 1000,
  limit: 5,
});
const quoteSchema = z.object({
  name: z.string().trim().min(2).max(191),
  email: z.string().trim().email().max(191),
  projectType: z.string().trim().min(2).max(191),
  quantity: z.coerce.number().int().min(1).max(10000).default(1),
  details: z.string().trim().min(10).max(10000),
  designImageData: z.string().max(5_600_000).optional(),
});

const contactLimiter = createRateLimiter('contact-write', {
  windowMs: 60 * 60 * 1000,
  limit: 5,
});
const contactEmailLimiter = createEmailRateLimiter('contact-email', {
  windowMs: 60 * 60 * 1000,
  limit: 5,
});
const contactPhoneLimiter = createFieldRateLimiter('contact-phone', 'phone', {
  windowMs: 60 * 60 * 1000,
  limit: 5,
}, (phone) => phone.replace(/[^\d+]/g, ''));
const newsletterLimiter = createRateLimiter('newsletter-write', {
  windowMs: 60 * 60 * 1000,
  limit: 5,
});
const newsletterEmailLimiter = createEmailRateLimiter('newsletter-email', {
  windowMs: 60 * 60 * 1000,
  limit: 5,
});
const newsletterSchema = z.object({
  email: z.string().trim().email().max(191),
  consent: z.literal(true),
  website: z.string().trim().max(191).optional().default(''),
  startedAt: z.number().finite().optional(),
});
const contactSchema = z.object({
  name: z.string().trim().min(2).max(191),
  email: z.string().trim().email().max(191),
  phone: z.string().trim().max(40).optional().default(''),
  subject: z.string().trim().min(3).max(191),
  message: z.string().trim().min(10).max(10000),
  website: z.string().trim().max(191).optional().default(''),
  startedAt: z.number().finite().optional(),
});

router.post('/newsletter/subscribe', newsletterLimiter, newsletterEmailLimiter, verifySameOrigin, async (req, res, next) => {
  const parsed = newsletterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Enter a valid email address and confirm your consent.' } });
  }

  const { website, startedAt } = parsed.data;
  const now = Date.now();
  if (website) {
    return res.status(400).json({ success: false, error: { message: 'Subscription could not be completed.' } });
  }
  if (!startedAt || startedAt > now + 5000 || now - startedAt < 2000) {
    return res.status(429).json({ success: false, error: { message: 'Please take a moment before subscribing.' } });
  }

  try {
    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return res.status(409).json({ success: false, error: { message: 'This email is already subscribed to ZAVIKOO updates.' } });
    }
    await prisma.newsletterSubscriber.create({ data: { email } });
    if (isMailerConfigured()) {
      try {
        await sendEmail({
          to: email,
          subject: 'Welcome to the ZAVIKOO Atelier',
          text: 'Welcome to the ZAVIKOO Atelier. Thank you for subscribing to our updates, new collections, and special offers.\n\nZAVIKOO Custom Atelier',
          html: `<p style="margin-top:0;font-size:22px;color:#211f1a;">Welcome to the atelier</p><p>Thank you for subscribing to ZAVIKOO. You’ll now receive updates on new collections, custom pieces, and studio offers selected especially for you.</p><p style="margin:28px 0;"><a href="${escapeHtml(process.env.CLIENT_ORIGIN || '')}" style="display:inline-block;padding:14px 24px;background:#211f1a;color:#fff;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;letter-spacing:1px;">EXPLORE ZAVIKOO</a></p><p style="font-size:13px;color:#777166;">If you did not request these updates, you can ignore this email.</p>`,
        });
      } catch (emailError) {
        console.error('Newsletter confirmation email failed:', emailError.message);
      }
    }
    return res.status(201).json({
      success: true,
      data: { message: 'Subscription successful. Please check your email for confirmation.' },
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ success: false, error: { message: 'This email is already subscribed to ZAVIKOO updates.' } });
    }
    return next(error);
  }
});

router.post('/contact', contactLimiter, contactEmailLimiter, contactPhoneLimiter, verifySameOrigin, async (req, res, next) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { message: 'Please check the contact form and complete all required fields.' } });
  }

  const { website, startedAt, ...contact } = parsed.data;
  const now = Date.now();
  if (website) {
    return res.status(400).json({ success: false, error: { message: 'Your message could not be sent.' } });
  }
  if (!startedAt || startedAt > now + 5000 || now - startedAt < 3000) {
    return res.status(429).json({ success: false, error: { message: 'Please take a moment before sending your message.' } });
  }

  try {
    const email = contact.email.toLowerCase();
    const recentDuplicate = await prisma.contactMessage.findFirst({
      where: {
        email,
        message: contact.message,
        createdAt: { gte: new Date(now - 10 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (recentDuplicate) {
      return res.status(429).json({ success: false, error: { message: 'This message was already sent recently. Please wait before sending it again.' } });
    }

    const contactMessage = await prisma.contactMessage.create({
      data: { ...contact, email, phone: contact.phone || null },
      select: { id: true, createdAt: true },
    });
    return res.status(201).json({
      success: true,
      data: { messageId: contactMessage.id, message: 'Thank you for reaching out. Our studio team will be in touch.' },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/quote', quoteLimiter, quoteJsonParser, quoteEmailLimiter, async (req, res, next) => {
  const parsed = quoteSchema.safeParse(req.body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const message = fieldErrors.details?.[0]
      || fieldErrors.name?.[0]
      || fieldErrors.email?.[0]
      || fieldErrors.quantity?.[0]
      || fieldErrors.projectType?.[0]
      || 'Please complete all quote request fields.';
    return res.status(400).json({ success: false, error: { message, details: parsed.error.flatten() } });
  }

  let designImage;
  if (parsed.data.designImageData) {
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(parsed.data.designImageData);
    if (!match) {
      return res.status(400).json({ success: false, error: { message: 'Upload a PNG, JPG, or WebP design image.' } });
    }
    const [, mimeType, encoded] = match;
    const imageData = Buffer.from(encoded, 'base64');
    const validBase64 = imageData.length > 0 && imageData.toString('base64') === encoded;
    const validSignature = mimeType === 'image/png'
      ? imageData.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : mimeType === 'image/jpeg'
        ? imageData.length >= 3 && imageData[0] === 0xff && imageData[1] === 0xd8 && imageData[2] === 0xff
        : imageData.length >= 12
          && imageData.toString('ascii', 0, 4) === 'RIFF'
          && imageData.toString('ascii', 8, 12) === 'WEBP';
    if (imageData.length > 4 * 1024 * 1024 || !validBase64 || !validSignature) {
      return res.status(400).json({ success: false, error: { message: 'Image must be a valid PNG, JPG, or WebP file no larger than 4 MB.' } });
    }
    designImage = { imageData, mimeType };
  }

  try {
    const quote = await prisma.$transaction(async (tx) => {
      const created = await tx.quote.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email.toLowerCase(),
          projectType: parsed.data.projectType,
          quantity: parsed.data.quantity,
          details: parsed.data.details,
          designImage: designImage ? { create: designImage } : undefined,
        },
        select: { id: true, status: true, createdAt: true, name: true, email: true },
      });
      return created;
    });
    if (isMailerConfigured()) {
      try {
        await sendEmail({
          to: quote.email,
          subject: `ZAVIKOO quote request received — ZKQ-${quote.id}`,
          text: `Hi ${quote.name},\n\nWe received your custom quote request (ZKQ-${quote.id}) and will reply shortly.\n\nZAVIKOO Custom Atelier`,
          html: `<p>Hi ${escapeHtml(quote.name)},</p><p>We received your custom quote request <strong>ZKQ-${quote.id}</strong> and will reply shortly.</p><p>ZAVIKOO Custom Atelier</p>`,
        });
      } catch (emailError) {
        console.error('Quote acknowledgement email failed:', emailError.message);
      }
    }
    return res.status(201).json({
      success: true,
      data: { quoteId: `ZKQ-${quote.id}`, status: quote.status.toLowerCase(), message: 'Your custom quote request has been received. We will reply shortly.' },
    });
  } catch (error) {
    return next(error);
  }
});

const designPositionSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(5).max(90),
  height: z.number().min(5).max(80),
});
const designPositionsSchema = z.object({
  front: designPositionSchema.optional(),
  back: designPositionSchema.optional(),
}).optional();

const checkoutSchema = z.object({
  customerName: z.string().trim().min(2).max(191),
  email: z.string().trim().email().max(191),
  phone: z.string().trim().min(7).max(40),
  address: z.object({
    line1: z.string().trim().min(4).max(191),
    line2: z.string().trim().max(191).optional().default(''),
    city: z.string().trim().min(2).max(100),
    province: z.string().trim().max(100).optional().default(''),
    postalCode: z.string().trim().max(30).optional().default(''),
    country: z.string().trim().min(2).max(100).default('Pakistan'),
  }),
  notes: z.string().trim().max(2000).optional().default(''),
  items: z.array(z.object({
    sku: z.string().trim().min(2).max(191),
    customProductId: z.number().int().positive().optional(),
    color: z.string().trim().min(1).max(60),
    size: z.string().trim().min(1).max(40),
    qty: z.number().int().min(1).max(20),
    design: z.object({
      schemaVersion: z.literal(1),
      text: z.string().max(80).optional().default(''),
      textPlacement: z.enum(['front', 'back', 'both']).optional(),
      imagePlacement: z.enum(['front', 'back', 'both']).optional().default('back'),
      textSize: z.number().int().min(12).max(32).optional().default(22),
      textFont: z.string().trim().min(1).max(191).optional().default('Hanken Grotesk'),
      textColorMode: z.enum(['solid', 'gradient']).optional().default('solid'),
      textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#202020'),
      textGradientStart: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#F59E0B'),
      textGradientEnd: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#EF4444'),
      textGradientAngle: z.number().int().min(0).max(360).optional().default(90),
      imageSizeInches: z.number().int().refine((value) => [10, 12, 14, 16, 18].includes(value)).optional().default(14),
      textWidthInches: z.number().int().refine((value) => [3, 4, 5, 6, 7].includes(value)).optional().default(5),
      imageScale: z.number().min(0.5).max(2).optional().default(1),
      textPositions: designPositionsSchema,
      imagePositions: designPositionsSchema,
      imageData: z.string().max(7_000_000).optional().default('')
        .refine((value) => !value || isValidDesignImageDataUrl(value), `Use a valid PNG, JPEG, or WebP design image no larger than ${MAX_DESIGN_IMAGE_BYTES / 1024 / 1024} MB.`),
      garmentName: z.string().trim().max(191).optional(),
      garmentType: z.enum(['tshirt', 'drop-shoulder', 'hoodie', 'sweatshirt', 'long-sleeve']).optional(),
      color: z.string().trim().max(40).optional(),
      size: z.string().trim().max(40).optional(),
      xsMeasurements: z.object({ length: z.number().positive().max(200), chest: z.number().positive().max(300) }).optional(),
      placement: z.enum(['center', 'back', 'left']).optional(),
      style: z.string().max(80).optional(),
      rightsConfirmed: z.literal(true),
    }).refine((design) => Boolean(design.text.trim() || design.imageData), 'Add text or a design image.').optional(),
  })).min(1).max(30),
});
const customColorNames = ['White', 'Black', 'Navy', 'Beige', 'Sage', 'Red', 'Blue', 'Pink'];
const teeGarmentTypes = ['tshirt', 'drop-shoulder', 'long-sleeve'];
const customSizesByGarmentType = {
  tshirt: ['XS', 'S', 'M', 'L', 'XL'],
  'drop-shoulder': ['XS', 'S', 'M', 'L', 'XL'],
  'long-sleeve': ['XS', 'S', 'M', 'L', 'XL'],
  hoodie: ['S', 'M', 'L', 'XL'],
  sweatshirt: ['S', 'M', 'L', 'XL'],
};

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = canonicalJson(value[key]);
      return result;
    }, {});
  }
  return value;
}

function sameDesign(left, right) {
  return JSON.stringify(canonicalJson(left)) === JSON.stringify(canonicalJson(right));
}

const checkoutLimiter = createRateLimiter('checkout-write', {
  windowMs: 60 * 60 * 1000,
  limit: 10,
});
const checkoutEmailLimiter = createEmailRateLimiter('checkout-email', {
  windowMs: 60 * 60 * 1000,
  limit: 10,
});
const checkoutPhoneLimiter = createFieldRateLimiter('checkout-phone', 'phone', {
  windowMs: 60 * 60 * 1000,
  limit: 10,
}, (phone) => phone.replace(/[^\d+]/g, ''));

router.post('/checkout', checkoutLimiter, requireCustomer, checkoutJsonParser, checkoutEmailLimiter, checkoutPhoneLimiter, async (req, res, next) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Invalid checkout details', details: parsed.error.flatten() } });

  const key = req.get('Idempotency-Key')?.trim();
  if (key && (key.length < 8 || key.length > 191)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid idempotency key' } });
  }

  try {
    const idempotencyHash = key
      ? createHash('sha256').update(JSON.stringify(parsed.data)).digest('hex')
      : null;
    if (key) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey: key },
        select: { orderNumber: true, status: true, email: true, idempotencyHash: true, totalPaisa: true },
      });
      if (existing) {
        if (existing.email !== parsed.data.email.toLowerCase() || existing.idempotencyHash !== idempotencyHash) {
          return res.status(409).json({ success: false, error: { message: 'This checkout request key has already been used.' } });
        }
        return res.status(200).json({
          success: true,
          data: { orderNumber: existing.orderNumber, status: existing.status, totalPaisa: existing.totalPaisa, message: 'Order already received.' },
        });
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      const orderItems = [];
      const stockMovements = [];
      let subtotalPaisa = 0;
      const orderNumber = `ZKV-${Date.now()}-${randomBytes(8).toString('hex').toUpperCase()}`;

      for (const item of parsed.data.items) {
        const customProduct = item.customProductId
          ? await tx.customProduct.findFirst({ where: { id: item.customProductId, isActive: true } })
          : null;
        if (item.customProductId && !customProduct) {
          const error = new Error('This custom garment is no longer available.');
          error.status = 409;
          throw error;
        }
        if (customProduct) {
          if (!item.design) {
            const error = new Error('Custom garments need a saved design before checkout.');
            error.status = 400;
            throw error;
          }
          const allowedSizes = customSizesByGarmentType[customProduct.garmentType] || [];
          if (!customColorNames.includes(item.color) || !allowedSizes.includes(item.size)) {
            const error = new Error('Choose a valid garment color and size.');
            error.status = 400;
            throw error;
          }
          if (item.size === 'XS' && teeGarmentTypes.includes(customProduct.garmentType) && !item.design?.xsMeasurements) {
            const error = new Error('Enter length and chest measurements for XS size.');
            error.status = 400;
            throw error;
          }
          let unitPricePaisa = customProduct.basePricePaisa;
          if (item.design.imageData) {
            if (item.design.imagePlacement === 'both') {
              unitPricePaisa += [16, 18].includes(item.design.imageSizeInches) ? 70000 : 50000;
            } else if ([16, 18].includes(item.design.imageSizeInches)) {
              unitPricePaisa += item.design.imageSizeInches === 16 ? 10000 : 30000;
            }
          }
          if (item.design.text) {
            if (item.design.textPlacement === 'both') {
              unitPricePaisa += [6, 7].includes(item.design.textWidthInches) ? 15000 : 10000;
            } else if ([6, 7].includes(item.design.textWidthInches)) {
              unitPricePaisa += 5000;
            }
          }
          if (unitPricePaisa <= 0) {
            const error = new Error('A custom garment price is not configured correctly.');
            error.status = 409;
            throw error;
          }
          subtotalPaisa += unitPricePaisa * item.qty;
          if (!Number.isSafeInteger(subtotalPaisa) || subtotalPaisa > 2147483647) {
            const error = new Error('Order total exceeds the supported amount.');
            error.status = 400;
            throw error;
          }
          const layoutJson = {
            ...item.design,
            garmentName: customProduct.name,
            garmentType: customProduct.garmentType,
            color: item.color,
            size: item.size,
          };
          let design = null;
          if (req.user?.role === 'CUSTOMER') {
            const savedDesigns = await tx.customDesign.findMany({
              where: { userId: req.user.id, customProductId: customProduct.id, status: 'DRAFT' },
              orderBy: { createdAt: 'desc' },
              select: { id: true, layoutJson: true },
            });
            const savedDesign = savedDesigns.find((candidate) => sameDesign(candidate.layoutJson, layoutJson));
            if (savedDesign) {
              design = await tx.customDesign.update({
                where: { id: savedDesign.id },
                data: { status: 'SUBMITTED' },
                select: { id: true },
              });
            }
          }
          if (!design) {
            design = await tx.customDesign.create({
              data: {
                userId: req.user?.role === 'CUSTOMER' ? req.user.id : undefined,
                customProductId: customProduct.id,
                schemaVersion: item.design.schemaVersion,
                layoutJson,
                rightsConfirmed: item.design.rightsConfirmed,
                status: 'SUBMITTED',
              },
              select: { id: true },
            });
          }
          orderItems.push({
            designId: design.id,
            nameSnapshot: customProduct.name,
            skuSnapshot: customProduct.sku,
            size: item.size,
            color: item.color,
            qty: item.qty,
            unitPricePaisa,
          });
          continue;
        }

        const product = await tx.product.findFirst({
          where: { OR: [{ sku: item.sku }, { slug: item.sku }], status: 'PUBLISHED' },
          include: { variants: { where: { color: item.color, size: item.size } } },
        });
        const variant = product?.variants[0];
        if (!product || !variant) {
          const error = new Error('One or more selected products or variants are no longer available.');
          error.status = 409;
          throw error;
        }
        if (item.design && !product.isCustomizable) {
          const error = new Error(`${product.name} does not support customization.`);
          error.status = 400;
          throw error;
        }

        if (!product.isMadeToOrder) {
          const reserved = await tx.productVariant.updateMany({
            where: { id: variant.id, stockQty: { gte: item.qty } },
            data: { stockQty: { decrement: item.qty } },
          });
          if (reserved.count !== 1) {
            const error = new Error(`${product.name} (${variant.size}, ${variant.color}) does not have enough stock.`);
            error.status = 409;
            throw error;
          }
          stockMovements.push({
            variantId: variant.id,
            quantityChange: -item.qty,
            reason: `Order ${orderNumber}`,
          });
        }

        const unitPricePaisa = (product.salePricePaisa ?? product.basePricePaisa) + variant.priceDeltaPaisa;
        if (unitPricePaisa <= 0) {
          const error = new Error('A product price is not configured correctly.');
          error.status = 409;
          throw error;
        }
        subtotalPaisa += unitPricePaisa * item.qty;
        if (!Number.isSafeInteger(subtotalPaisa) || subtotalPaisa > 2147483647) {
          const error = new Error('Order total exceeds the supported amount.');
          error.status = 400;
          throw error;
        }
        let designId;
        if (item.design) {
          const design = await tx.customDesign.create({
            data: {
              productId: product.id,
              schemaVersion: item.design.schemaVersion,
              layoutJson: item.design,
              rightsConfirmed: item.design.rightsConfirmed,
              status: 'SUBMITTED',
            },
            select: { id: true },
          });
          designId = design.id;
        }
        orderItems.push({
          variantId: variant.id,
          designId,
          nameSnapshot: product.name,
          skuSnapshot: variant.sku,
          size: variant.size,
          color: variant.color,
          qty: item.qty,
          unitPricePaisa,
        });
      }

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: req.user?.role === 'CUSTOMER' ? req.user.id : undefined,
          email: parsed.data.email.toLowerCase(),
          phone: parsed.data.phone,
          shippingAddress: { name: parsed.data.customerName, ...parsed.data.address },
          customerNotes: parsed.data.notes || null,
          subtotalPaisa,
          totalPaisa: subtotalPaisa,
          idempotencyKey: key || undefined,
          idempotencyHash: idempotencyHash || undefined,
          items: { create: orderItems },
          payments: { create: { method: 'COD', amountPaisa: subtotalPaisa } },
        },
        select: {
          orderNumber: true,
          status: true,
          email: true,
          subtotalPaisa: true,
          discountPaisa: true,
          shippingPaisa: true,
          totalPaisa: true,
        },
      });
      if (stockMovements.length) {
        await tx.inventoryMovement.createMany({ data: stockMovements });
      }
      return {
        order: createdOrder,
        items: orderItems.map((item, index) => ({ ...item, design: parsed.data.items[index].design })),
      };
    }, { isolationLevel: 'Serializable' });

    if (isMailerConfigured()) {
      try {
        const formatMoney = (paisa) => `PKR ${(paisa / 100).toLocaleString('en-PK')}`;
        const itemText = order.items.map((item) => {
          const designDetails = item.design
            ? `\n  Customization: ${item.design.text ? `Text "${item.design.text}" (${item.design.textPlacement || 'placement not specified'})` : 'Custom artwork'}`
            : '';
          return `${item.nameSnapshot} (${item.skuSnapshot})\n  Color: ${item.color} | Size: ${item.size} | Quantity: ${item.qty}${designDetails}\n  ${formatMoney(item.unitPricePaisa)} each — ${formatMoney(item.unitPricePaisa * item.qty)}`;
        }).join('\n\n');
        const addressLines = [
          parsed.data.address.line1,
          parsed.data.address.line2,
          parsed.data.address.city,
          parsed.data.address.province,
          parsed.data.address.postalCode,
          parsed.data.address.country,
        ].filter(Boolean);
        const itemRows = order.items.map((item) => {
          const designDetails = item.design
            ? `<br><span style="font-size:13px;color:#777166;">Customization: ${item.design.text
              ? `Text “${escapeHtml(item.design.text)}” (${escapeHtml(item.design.textPlacement || 'placement not specified')})`
              : 'Custom artwork'}</span>`
            : '';
          return `<tr>
          <td style="padding:12px 8px;border-bottom:1px solid #ded8cc;">
            <strong>${escapeHtml(item.nameSnapshot)}</strong><br>
            <span style="font-size:13px;color:#777166;">SKU: ${escapeHtml(item.skuSnapshot)} · ${escapeHtml(item.color)} · Size ${escapeHtml(item.size)} · Qty ${item.qty} · ${formatMoney(item.unitPricePaisa)} each</span>
            ${designDetails}
          </td>
          <td align="right" style="padding:12px 8px;border-bottom:1px solid #ded8cc;white-space:nowrap;">${formatMoney(item.unitPricePaisa * item.qty)}</td>
        </tr>`;
        }).join('');
        const safeAddress = addressLines.map((line) => escapeHtml(line)).join('<br>');
        const safeNotes = parsed.data.notes ? `<p><strong>Order notes:</strong><br>${escapeHtml(parsed.data.notes).replace(/\n/g, '<br>')}</p>` : '';
        await sendEmail({
          to: order.order.email,
          subject: `Order ${order.order.orderNumber} received | ZAVIKOO`,
          text: `Hi ${parsed.data.customerName},\n\nYour order ${order.order.orderNumber} has been received.\n\nORDER SUMMARY\n${itemText}\n\nSubtotal: ${formatMoney(order.order.subtotalPaisa)}\nDiscount: ${formatMoney(order.order.discountPaisa)}\nDelivery: ${formatMoney(order.order.shippingPaisa)}\nTotal: ${formatMoney(order.order.totalPaisa)}\nPayment: Cash on delivery\n\nDELIVERY DETAILS\n${parsed.data.customerName}\n${addressLines.join('\n')}\nPhone: ${parsed.data.phone}\n${parsed.data.notes ? `\nOrder notes: ${parsed.data.notes}\n` : ''}\nPayment is due when your order arrives.\n\nZAVIKOO Custom Atelier`,
          html: `<p>Hi ${escapeHtml(parsed.data.customerName)},</p>
            <p>Your order <strong>${escapeHtml(order.order.orderNumber)}</strong> has been received. Here is your complete order summary:</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:20px 0;">
              <thead><tr><th align="left" style="padding:10px 8px;border-bottom:2px solid #211f1a;">Item</th><th align="right" style="padding:10px 8px;border-bottom:2px solid #211f1a;">Amount</th></tr></thead>
              <tbody>${itemRows}</tbody>
              <tfoot>
                <tr><td style="padding:10px 8px;">Subtotal</td><td align="right" style="padding:10px 8px;">${formatMoney(order.order.subtotalPaisa)}</td></tr>
                <tr><td style="padding:8px;">Discount</td><td align="right" style="padding:8px;">${formatMoney(order.order.discountPaisa)}</td></tr>
                <tr><td style="padding:8px;">Delivery</td><td align="right" style="padding:8px;">${formatMoney(order.order.shippingPaisa)}</td></tr>
                <tr><td style="padding:12px 8px;border-top:1px solid #211f1a;font-size:18px;"><strong>Total</strong></td><td align="right" style="padding:12px 8px;border-top:1px solid #211f1a;font-size:18px;"><strong>${formatMoney(order.order.totalPaisa)}</strong></td></tr>
              </tfoot>
            </table>
            <p><strong>Payment:</strong> Cash on delivery (pay when your order arrives)</p>
            <p><strong>Delivery details</strong><br>${escapeHtml(parsed.data.customerName)}<br>${safeAddress}<br>Phone: ${escapeHtml(parsed.data.phone)}</p>
            ${safeNotes}
            <p>We will be in touch with the next steps.</p>`,
        });
      } catch (emailError) {
        console.error('Order confirmation email failed:', emailError.message);
      }
    }
    return res.status(201).json({
      success: true,
      data: { ...order.order, message: 'Your order has been received. Payment is due on delivery.' },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
