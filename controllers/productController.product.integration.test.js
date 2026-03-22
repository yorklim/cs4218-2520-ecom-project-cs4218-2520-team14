import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

import Category from "../models/categoryModel.js";
import Product from "../models/productModel.js";

jest.mock("../config/db.js", () => jest.fn());
import { server } from "../server.js";
import app from "../app.js";

function binaryParser(res, callback) {
    res.setEncoding("binary");
    let data = "";
    res.on("data", (chunk) => {
        data += chunk;
    });
    res.on("end", () => {
        callback(null, Buffer.from(data, "binary"));
    });
}

let mongoServer;
let consoleSpy;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
})

afterEach(async () => {
    jest.restoreAllMocks();

    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
        await collections[key].deleteMany({});
    }
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    server.close();
});

async function createCategory(name = "Books", slug = "books") {
    return await Category.create({ name, slug });
}

async function createProduct({
    name = "Best Book",
    slug = "best-book",
    description = "A very good book",
    price = 18,
    category,
    quantity = 10,
    shipping = false,
    photoData = Buffer.from("sample photo data"),
    contentType = "image/jpeg",
    createdAt,
}) {
    const product = await Product.create({
        name,
        slug,
        description,
        price,
        category,
        quantity,
        shipping,
        photo: {
            data: photoData,
            contentType,
        },
    });

    if (createdAt) {
        await Product.findByIdAndUpdate(product._id, { createdAt });
    }

    return await Product.findById(product._id);
}

describe("getProductController", () => {
    test("should return 200, success true, expected keys, populated category, no photo field, and products sorted newest first with max 12", async () => {
        const books = await createCategory("Books", "books");
        const electronics = await createCategory("Electronics", "electronics");

        // Seed 13 products so controller limit(12) can be verified
        for (let i = 1; i <= 13; i++) {
            const category = i % 2 === 0 ? electronics._id : books._id;

            await createProduct({
                name: `Product ${i}`,
                slug: `product-${i}`,
                description: `Description ${i}`,
                price: i * 10,
                category,
                quantity: i,
                shipping: i % 2 === 0,
                createdAt: new Date(2024, 0, i), // Jan i, 2024
            });
        }

        const res = await request(app).get("/api/v1/product/get-product");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        expect(res.body).toHaveProperty("success");
        expect(res.body).toHaveProperty("message");
        expect(res.body).toHaveProperty("countTotal");
        expect(res.body).toHaveProperty("products");

        expect(Array.isArray(res.body.products)).toBe(true);
        expect(res.body.products.length).toBeLessThanOrEqual(12);
        expect(res.body.countTotal).toBe(res.body.products.length);

        // Sorted by createdAt descending => newest first
        for (let i = 0; i < res.body.products.length - 1; i++) {
            const current = new Date(res.body.products[i].createdAt).getTime();
            const next = new Date(res.body.products[i + 1].createdAt).getTime();
            expect(current).toBeGreaterThanOrEqual(next);
        }

        // Because 13 were inserted and limit is 12, newest should include product-13 but exclude oldest product-1
        const returnedSlugs = res.body.products.map((p) => p.slug);
        expect(returnedSlugs).toContain("product-13");
        expect(returnedSlugs).not.toContain("product-1");

        // No raw photo field returned
        for (const product of res.body.products) {
            expect(product.photo).toBeUndefined();
        }

        // Category should be populated object, not just an id
        for (const product of res.body.products) {
            expect(product.category).toBeTruthy();
            expect(typeof product.category).toBe("object");
            expect(product.category).toHaveProperty("_id");
            expect(product.category).toHaveProperty("name");
            expect(product.category).toHaveProperty("slug");
        }
    });

    test("should return 500 with success false when product query fails", async () => {
        jest.spyOn(Product, "find").mockImplementation(() => {
            throw new Error("db blew up");
        });

        const res = await request(app).get("/api/v1/product/get-product");

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            success: false,
            message: "Error in getting products",
            error: "db blew up",
        });
    });
});

describe("getSingleProductController", () => {
    test("should return 200, success true, expected keys, matching slug, populated category, and no photo field", async () => {
        const books = await createCategory("Books", "books");

        await createProduct({
            name: "Other Product",
            slug: "other-product",
            description: "Other description",
            price: 50,
            category: books._id,
            quantity: 3,
        });

        const target = await createProduct({
            name: "Best Book",
            slug: "best-book",
            description: "A very good book",
            price: 18,
            category: books._id,
            quantity: 10,
        });

        const res = await request(app).get(
            `/api/v1/product/get-product/${target.slug}`
        );

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        expect(res.body).toHaveProperty("success");
        expect(res.body).toHaveProperty("message");
        expect(res.body).toHaveProperty("product");

        expect(res.body.product).toBeTruthy();
        expect(res.body.product.slug).toBe("best-book");
        expect(res.body.product.name).toBe("Best Book");

        // No raw photo field returned
        expect(res.body.product.photo).toBeUndefined();

        // Category populated
        expect(res.body.product.category).toBeTruthy();
        expect(typeof res.body.product.category).toBe("object");
        expect(res.body.product.category).toHaveProperty("_id");
        expect(res.body.product.category).toHaveProperty("name", "Books");
        expect(res.body.product.category).toHaveProperty("slug", "books");
    });

    test("should return 200 with product null for non-existent slug", async () => {
        const res = await request(app).get(
            "/api/v1/product/get-product/does-not-exist"
        );

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.product).toBeNull();
        expect(res.body.message).toBe("Single Product Fetched");
    });

    test("should return 500 with success false when single product query fails", async () => {
        jest.spyOn(Product, "findOne").mockImplementation(() => {
            throw new Error("db blew up");
        });

        const res = await request(app).get("/api/v1/product/get-product/test-slug");

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            success: false,
            message: "Error while getting single product",
            error: "db blew up",
        });
    });
});

describe("productPhotoController", () => {
    test("should return 200, binary photo data, correct Content-Type, and no JSON wrapper", async () => {
        const books = await createCategory("Books", "books");
        const photoBuffer = Buffer.from("fake-image-bytes");

        const product = await createProduct({
            name: "Photo Product",
            slug: "photo-product",
            description: "Has photo",
            price: 100,
            category: books._id,
            quantity: 2,
            photoData: photoBuffer,
            contentType: "image/jpeg",
        });

        // Assumes your route is /api/v1/product/product-photo/:pid
        const res = await request(app)
            .get(`/api/v1/product/product-photo/${product._id}`)
            .buffer(true)
            .parse(binaryParser);

        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toContain("image/jpeg");

        expect(Buffer.isBuffer(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body.equals(photoBuffer)).toBe(true);
    });

    test("should return 404 when product id does not exist", async () => {
        const missingId = new mongoose.Types.ObjectId();

        const res = await request(app).get(
            `/api/v1/product/product-photo/${missingId}`
        );

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            success: false,
            message: "Photo not found",
        });
    });

    test("should return 404 when product exists but has no photo data", async () => {
        const books = await createCategory("Books", "books");

        const product = await Product.create({
            name: "No Photo Product",
            slug: "no-photo-product",
            description: "No photo here",
            price: 20,
            category: books._id,
            quantity: 1,
            shipping: false,
            photo: {
                data: null,
                contentType: "image/jpeg",
            },
        });

        const res = await request(app).get(
            `/api/v1/product/product-photo/${product._id}`
        );

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            success: false,
            message: "Photo not found",
        });
    });

    test("should return 500 with success false when photo query fails", async () => {
        jest.spyOn(Product, "findById").mockImplementation(() => {
            throw new Error("db blew up");
        });

        const someId = new mongoose.Types.ObjectId();

        const res = await request(app).get(
            `/api/v1/product/product-photo/${someId}`
        );

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            success: false,
            message: "Error while getting photo",
            error: "db blew up",
        });
    });
});

describe("productFiltersController", () => {
  test("should return 200 and filtered products when filtering by category only", async () => {
    const books = await createCategory("Books", "books");
    const electronics = await createCategory("Electronics", "electronics");

    const book1 = await createProduct({
      name: "Book 1",
      slug: "book-1",
      price: 20,
      category: books._id,
    });

    const book2 = await createProduct({
      name: "Book 2",
      slug: "book-2",
      price: 35,
      category: books._id,
    });

    await createProduct({
      name: "Laptop 1",
      slug: "laptop-1",
      price: 1200,
      category: electronics._id,
    });

    const res = await request(app)
      .post("/api/v1/product/product-filters")
      .send({
        checked: [books._id.toString()],
        radio: [],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("success");
    expect(res.body).toHaveProperty("products");
    expect(Array.isArray(res.body.products)).toBe(true);

    expect(res.body.products).toHaveLength(2);

    const returnedIds = res.body.products.map((p) => p._id.toString());
    expect(returnedIds).toEqual(
      expect.arrayContaining([book1._id.toString(), book2._id.toString()])
    );

    for (const product of res.body.products) {
      expect(product.category.toString()).toBe(books._id.toString());
    }
  });

  test("should return 200 and filtered products when filtering by price range only", async () => {
    const books = await createCategory("Books", "books");

    const cheap = await createProduct({
      name: "Cheap Book",
      slug: "cheap-book",
      price: 20,
      category: books._id,
    });

    const mid = await createProduct({
      name: "Mid Book",
      slug: "mid-book",
      price: 50,
      category: books._id,
    });

    await createProduct({
      name: "Expensive Book",
      slug: "expensive-book",
      price: 200,
      category: books._id,
    });

    const res = await request(app)
      .post("/api/v1/product/product-filters")
      .send({
        checked: [],
        radio: [10, 60],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products).toHaveLength(2);

    const returnedIds = res.body.products.map((p) => p._id.toString());
    expect(returnedIds).toEqual(
      expect.arrayContaining([cheap._id.toString(), mid._id.toString()])
    );

    for (const product of res.body.products) {
      expect(product.price).toBeGreaterThanOrEqual(10);
      expect(product.price).toBeLessThanOrEqual(60);
    }
  });

  test("should return 200 and filtered products when filtering by both category and price range", async () => {
    const books = await createCategory("Books", "books");
    const electronics = await createCategory("Electronics", "electronics");

    const matching = await createProduct({
      name: "Matching Book",
      slug: "matching-book",
      price: 40,
      category: books._id,
    });

    await createProduct({
      name: "Wrong Price Book",
      slug: "wrong-price-book",
      price: 150,
      category: books._id,
    });

    await createProduct({
      name: "Wrong Category Laptop",
      slug: "wrong-category-laptop",
      price: 40,
      category: electronics._id,
    });

    const res = await request(app)
      .post("/api/v1/product/product-filters")
      .send({
        checked: [books._id.toString()],
        radio: [30, 60],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0]._id.toString()).toBe(matching._id.toString());
    expect(res.body.products[0].category.toString()).toBe(books._id.toString());
    expect(res.body.products[0].price).toBeGreaterThanOrEqual(30);
    expect(res.body.products[0].price).toBeLessThanOrEqual(60);
  });

  test("should return all products when no filters are provided", async () => {
    const books = await createCategory("Books", "books");
    const electronics = await createCategory("Electronics", "electronics");

    await createProduct({
      name: "Book 1",
      slug: "book-1",
      price: 20,
      category: books._id,
    });

    await createProduct({
      name: "Laptop 1",
      slug: "laptop-1",
      price: 1200,
      category: electronics._id,
    });

    const res = await request(app)
      .post("/api/v1/product/product-filters")
      .send({
        checked: [],
        radio: [],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("success");
    expect(res.body).toHaveProperty("products");
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products).toHaveLength(2);
  });

  test("should return 400 with success false when filter query fails", async () => {
    jest.spyOn(Product, "find").mockRejectedValue(new Error("db blew up"));

    const res = await request(app)
      .post("/api/v1/product/product-filters")
      .send({
        checked: [],
        radio: [],
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: "Error while filtering products",
      error: "db blew up",
    });
  });
});

describe("productCountController", () => {
  test("should return 200, success true, expected keys, and correct total", async () => {
    const books = await createCategory("Books", "books");

    await createProduct({
      name: "Book 1",
      slug: "book-1",
      price: 20,
      category: books._id,
    });

    await createProduct({
      name: "Book 2",
      slug: "book-2",
      price: 30,
      category: books._id,
    });

    const res = await request(app).get("/api/v1/product/product-count");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("success");
    expect(res.body).toHaveProperty("total");
    expect(typeof res.body.total).toBe("number");
    expect(res.body.total).toBe(2);
  });

  test("should update total correctly when products are added and removed", async () => {
    const books = await createCategory("Books", "books");

    const p1 = await createProduct({
      name: "Book 1",
      slug: "book-1",
      price: 20,
      category: books._id,
    });

    let res = await request(app).get("/api/v1/product/product-count");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);

    await createProduct({
      name: "Book 2",
      slug: "book-2",
      price: 30,
      category: books._id,
    });

    res = await request(app).get("/api/v1/product/product-count");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);

    await Product.findByIdAndDelete(p1._id);

    res = await request(app).get("/api/v1/product/product-count");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });

  test("should return 400 with success false when product count query fails", async () => {
    const estimatedDocumentCountMock = jest
      .fn()
      .mockRejectedValue(new Error("db blew up"));

    jest.spyOn(Product, "find").mockReturnValue({
      estimatedDocumentCount: estimatedDocumentCountMock,
    });

    const res = await request(app).get("/api/v1/product/product-count");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      message: "Error in product count",
      error: "db blew up",
      success: false,
    });
  });
});

describe("productListController", () => {
  test("should return 200, success true, expected keys, max 6 products, newest first, and no photo field for page 1", async () => {
    const books = await createCategory("Books", "books");

    for (let i = 1; i <= 8; i++) {
      await createProduct({
        name: `Book ${i}`,
        slug: `book-${i}`,
        price: i * 10,
        category: books._id,
        createdAt: new Date(2024, 0, i),
      });
    }

    const res = await request(app).get("/api/v1/product/product-list/1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("success");
    expect(res.body).toHaveProperty("products");
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products.length).toBeLessThanOrEqual(6);
    expect(res.body.products).toHaveLength(6);

    const returnedSlugs = res.body.products.map((p) => p.slug);
    expect(returnedSlugs).toEqual([
      "book-8",
      "book-7",
      "book-6",
      "book-5",
      "book-4",
      "book-3",
    ]);

    for (const product of res.body.products) {
      expect(product.photo).toBeUndefined();
    }

    for (let i = 0; i < res.body.products.length - 1; i++) {
      const current = new Date(res.body.products[i].createdAt).getTime();
      const next = new Date(res.body.products[i + 1].createdAt).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  test("should return the correct next set of products for page 2", async () => {
    const books = await createCategory("Books", "books");

    for (let i = 1; i <= 8; i++) {
      await createProduct({
        name: `Book ${i}`,
        slug: `book-${i}`,
        price: i * 10,
        category: books._id,
        createdAt: new Date(2024, 0, i),
      });
    }

    const res = await request(app).get("/api/v1/product/product-list/2");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products.length).toBeLessThanOrEqual(6);
    expect(res.body.products).toHaveLength(2);

    const returnedSlugs = res.body.products.map((p) => p.slug);
    expect(returnedSlugs).toEqual(["book-2", "book-1"]);

    for (const product of res.body.products) {
      expect(product.photo).toBeUndefined();
    }
  });

  test("should default to page 1 behavior when page parameter is missing/undefined in controller logic", async () => {
    const books = await createCategory("Books", "books");

    for (let i = 1; i <= 8; i++) {
      await createProduct({
        name: `Book ${i}`,
        slug: `book-${i}`,
        price: i * 10,
        category: books._id,
        createdAt: new Date(2024, 0, i),
      });
    }

    // Route requires :page, so simulate controller default behavior using "undefined"
    const res = await request(app).get("/api/v1/product/product-list/undefined");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const returnedSlugs = res.body.products.map((p) => p.slug);
    expect(returnedSlugs).toEqual([
      "book-8",
      "book-7",
      "book-6",
      "book-5",
      "book-4",
      "book-3",
    ]);
  });

  test("should return 400 with success false when product list query fails", async () => {
    jest.spyOn(Product, "find").mockImplementation(() => {
      throw new Error("db blew up");
    });

    const res = await request(app).get("/api/v1/product/product-list/1");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: "error in per page ctrl",
      error: "db blew up",
    });
  });
});

describe("searchProductController", () => {
  test("should return matching products by keyword in name", async () => {
    const books = await createCategory("Books", "books");

    await createProduct({
      name: "JavaScript Guide",
      slug: "javascript-guide",
      description: "Learn coding fast",
      price: 30,
      category: books._id,
    });

    await createProduct({
      name: "Cooking Basics",
      slug: "cooking-basics",
      description: "Kitchen starter guide",
      price: 20,
      category: books._id,
    });

    const res = await request(app).get("/api/v1/product/search/javascript");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("JavaScript Guide");
    expect(res.body[0].slug).toBe("javascript-guide");
    expect(res.body[0].photo).toBeUndefined();
  });

  test("should return matching products by keyword in description", async () => {
    const books = await createCategory("Books", "books");

    await createProduct({
      name: "Book One",
      slug: "book-one",
      description: "This teaches React very clearly",
      price: 40,
      category: books._id,
    });

    await createProduct({
      name: "Book Two",
      slug: "book-two",
      description: "History and literature",
      price: 25,
      category: books._id,
    });

    const res = await request(app).get("/api/v1/product/search/react");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].slug).toBe("book-one");
    expect(res.body[0].photo).toBeUndefined();
  });

  test("should be case-insensitive", async () => {
    const books = await createCategory("Books", "books");

    await createProduct({
      name: "Node Handbook",
      slug: "node-handbook",
      description: "Backend concepts",
      price: 35,
      category: books._id,
    });

    const res = await request(app).get("/api/v1/product/search/NODE");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].slug).toBe("node-handbook");
  });

  test("should return empty array when no products match", async () => {
    const books = await createCategory("Books", "books");

    await createProduct({
      name: "Node Handbook",
      slug: "node-handbook",
      description: "Backend concepts",
      price: 35,
      category: books._id,
    });

    const res = await request(app).get("/api/v1/product/search/doesnotmatch");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  test("should return 400 with success false when search query fails", async () => {
    jest.spyOn(Product, "find").mockImplementation(() => {
      throw new Error("db blew up");
    });

    const res = await request(app).get("/api/v1/product/search/test");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: "Error In Search Product API",
      error: "db blew up",
    });
  });
});

describe("relatedProductController", () => {
  test("should return 200 with related products in the same category excluding the current product", async () => {
    const books = await createCategory("Books", "books");
    const electronics = await createCategory("Electronics", "electronics");

    const current = await createProduct({
      name: "Current Book",
      slug: "current-book",
      description: "Current book",
      price: 20,
      category: books._id,
    });

    const related1 = await createProduct({
      name: "Related Book 1",
      slug: "related-book-1",
      description: "Related 1",
      price: 25,
      category: books._id,
    });

    const related2 = await createProduct({
      name: "Related Book 2",
      slug: "related-book-2",
      description: "Related 2",
      price: 30,
      category: books._id,
    });

    await createProduct({
      name: "Laptop",
      slug: "laptop",
      description: "Different category",
      price: 1000,
      category: electronics._id,
    });

    const res = await request(app).get(
      `/api/v1/product/related-product/${current._id}/${books._id}`
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("success");
    expect(res.body).toHaveProperty("products");
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products).toHaveLength(2);

    const returnedIds = res.body.products.map((p) => p._id.toString());
    expect(returnedIds).toEqual(
      expect.arrayContaining([related1._id.toString(), related2._id.toString()])
    );
    expect(returnedIds).not.toContain(current._id.toString());

    for (const product of res.body.products) {
      expect(product.photo).toBeUndefined();
      expect(product.category).toBeTruthy();
      expect(typeof product.category).toBe("object");
      expect(product.category).toHaveProperty("_id");
      expect(product.category).toHaveProperty("name");
      expect(product.category).toHaveProperty("slug");
      expect(product.category._id.toString()).toBe(books._id.toString());
    }
  });

  test("should limit related products to 3", async () => {
    const books = await createCategory("Books", "books");

    const current = await createProduct({
      name: "Current Book",
      slug: "current-book",
      description: "Current book",
      price: 20,
      category: books._id,
    });

    for (let i = 1; i <= 5; i++) {
      await createProduct({
        name: `Related Book ${i}`,
        slug: `related-book-${i}`,
        description: `Related ${i}`,
        price: 20 + i,
        category: books._id,
      });
    }

    const res = await request(app).get(
      `/api/v1/product/related-product/${current._id}/${books._id}`
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products.length).toBeLessThanOrEqual(3);
    expect(res.body.products).toHaveLength(3);
  });

  test("should return empty array when no related products exist", async () => {
    const books = await createCategory("Books", "books");

    const current = await createProduct({
      name: "Only Book",
      slug: "only-book",
      description: "No related products",
      price: 20,
      category: books._id,
    });

    const res = await request(app).get(
      `/api/v1/product/related-product/${current._id}/${books._id}`
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products).toHaveLength(0);
  });

  test("should return 400 with success false when related product query fails", async () => {
    jest.spyOn(Product, "find").mockImplementation(() => {
      throw new Error("db blew up");
    });

    const somePid = new mongoose.Types.ObjectId();
    const someCid = new mongoose.Types.ObjectId();

    const res = await request(app).get(
      `/api/v1/product/related-product/${somePid}/${someCid}`
    );

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: "error while getting related product",
      error: "db blew up",
    });
  });
});

describe("productCategoryController", () => {
  test("should return 200 with category and products for a valid category slug", async () => {
    const books = await createCategory("Books", "books");
    const electronics = await createCategory("Electronics", "electronics");

    const book1 = await createProduct({
      name: "Book 1",
      slug: "book-1",
      description: "Book 1 desc",
      price: 20,
      category: books._id,
    });

    const book2 = await createProduct({
      name: "Book 2",
      slug: "book-2",
      description: "Book 2 desc",
      price: 30,
      category: books._id,
    });

    await createProduct({
      name: "Laptop 1",
      slug: "laptop-1",
      description: "Laptop desc",
      price: 1000,
      category: electronics._id,
    });

    const res = await request(app).get("/api/v1/product/product-category/books");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(res.body).toHaveProperty("success");
    expect(res.body).toHaveProperty("category");
    expect(res.body).toHaveProperty("products");

    expect(res.body.category).toBeTruthy();
    expect(res.body.category.slug).toBe("books");
    expect(res.body.category.name).toBe("Books");

    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products).toHaveLength(2);

    const returnedIds = res.body.products.map((p) => p._id.toString());
    expect(returnedIds).toEqual(
      expect.arrayContaining([book1._id.toString(), book2._id.toString()])
    );

    for (const product of res.body.products) {
      expect(product.category).toBeTruthy();
      expect(typeof product.category).toBe("object");
      expect(product.category).toHaveProperty("_id");
      expect(product.category).toHaveProperty("name", "Books");
      expect(product.category).toHaveProperty("slug", "books");
    }
  });

  test("should return 404 when category slug does not exist", async () => {
    const res = await request(app).get(
      "/api/v1/product/product-category/does-not-exist"
    );

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "Category not found",
    });
  });

  test("should return 200 with empty products array when category exists but has no products", async () => {
    await createCategory("Books", "books");

    const res = await request(app).get("/api/v1/product/product-category/books");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.category.slug).toBe("books");
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products).toHaveLength(0);
  });

  test("should return 400 with success false when category lookup fails", async () => {
    jest.spyOn(Category, "findOne").mockRejectedValue(new Error("db blew up"));

    const res = await request(app).get("/api/v1/product/product-category/books");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: "db blew up",
      message: "Error While Getting products",
    });
  });

  test("should return 400 with success false when product lookup fails after category is found", async () => {
    const books = await createCategory("Books", "books");

    jest.spyOn(Product, "find").mockImplementation(() => {
      throw new Error("db blew up");
    });

    const res = await request(app).get(`/api/v1/product/product-category/${books.slug}`);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: "db blew up",
      message: "Error While Getting products",
    });
  });
});