import 'dotenv/config';
import { prisma } from '../src/db.js';
import { categories, collections, products } from '../src/data/catalog.js';

if (process.env.NODE_ENV === 'production') {
  throw new Error('The development catalog seed cannot run in production.');
}

try {
  const categoryIds = new Map();
  for (const category of categories) {
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      create: { name: category.name, slug: category.slug, isActive: true },
      update: { name: category.name, isActive: true },
    });
    categoryIds.set(category.slug, saved.id);
  }

  const collectionIds = new Map();
  for (const collection of collections) {
    const saved = await prisma.collection.upsert({
      where: { slug: collection.slug },
      create: { name: collection.name, slug: collection.slug, description: collection.description, isActive: true },
      update: { name: collection.name, description: collection.description, isActive: true },
    });
    collectionIds.set(collection.slug, saved.id);
  }

  for (const product of products) {
    const saved = await prisma.product.upsert({
      where: { sku: product.sku },
      create: {
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        description: product.description,
        material: product.material,
        basePricePaisa: product.basePricePaisa,
        salePricePaisa: product.salePricePaisa,
        status: 'PUBLISHED',
        isCustomizable: product.isCustomizable,
        isFeatured: product.isFeatured,
        categoryId: categoryIds.get(product.category),
      },
      update: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        material: product.material,
        basePricePaisa: product.basePricePaisa,
        salePricePaisa: product.salePricePaisa,
        status: 'PUBLISHED',
        isCustomizable: product.isCustomizable,
        isFeatured: product.isFeatured,
        categoryId: categoryIds.get(product.category),
      },
    });

    for (const [sortOrder, color] of product.colors.entries()) {
      for (const size of product.sizes) {
        const sku = `${product.sku}-${color.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}-${size}`;
        await prisma.productVariant.upsert({
          where: { sku },
          create: { productId: saved.id, sku, size, color, stockQty: 20, lowStockAt: 5 },
          update: { productId: saved.id, size, color },
        });
      }
    }

    const imageCount = await prisma.productImage.count({ where: { productId: saved.id } });
    if (imageCount === 0) {
      await prisma.productImage.create({
        data: { productId: saved.id, storageKey: product.image, altText: product.name, sortOrder: 0 },
      });
    }

    const collectionId = collectionIds.get(product.collection);
    if (collectionId) {
      await prisma.collectionProduct.upsert({
        where: { collectionId_productId: { collectionId, productId: saved.id } },
        create: { collectionId, productId: saved.id },
        update: {},
      });
    }
  }

  console.log(`Seeded ${categories.length} categories, ${collections.length} collections, and ${products.length} catalog products.`);
} finally {
  await prisma.$disconnect();
}

