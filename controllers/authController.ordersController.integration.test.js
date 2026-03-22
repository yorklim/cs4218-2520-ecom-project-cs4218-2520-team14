//Teng Hui Xin Alicia, A0259064Y
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import JWT from "jsonwebtoken";

jest.mock("../config/db.js", () => jest.fn());

import app from "../app.js";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import { hashPassword } from "../helpers/authHelper.js";

describe("getOrdersController Integration Tests", () => {
  let mongoServer;
  let user1;
  let user2;
  let user1Token;
  let user2Token;
  let category;
  let product1;
  let product2;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await orderModel.deleteMany({});
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});
    await userModel.deleteMany({});

    const hashedPassword = await hashPassword("password123");

    user1 = await userModel.create({
      name: "User One",
      email: "user1@test.com",
      password: hashedPassword,
      phone: "1111111111",
      address: "Address One",
      answer: "blue",
      role: 0,
    });

    user2 = await userModel.create({
      name: "User Two",
      email: "user2@test.com",
      password: hashedPassword,
      phone: "2222222222",
      address: "Address Two",
      answer: "red",
      role: 0,
    });

    user1Token = JWT.sign({ _id: user1._id }, process.env.JWT_SECRET);
    user2Token = JWT.sign({ _id: user2._id }, process.env.JWT_SECRET);

    category = await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });

    product1 = await productModel.create({
      name: "Phone",
      slug: "phone",
      description: "Test phone",
      price: 20,
      category: category._id,
      quantity: 10,
      shipping: true,
      photo: {
        data: Buffer.from(""),
        contentType: "image/jpeg",
      },
    });

    product2 = await productModel.create({
      name: "Laptop",
      slug: "laptop",
      description: "Test laptop",
      price: 30,
      category: category._id,
      quantity: 5,
      shipping: true,
      photo: {
        data: Buffer.from(""),
        contentType: "image/jpeg",
      },
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await orderModel.deleteMany({});
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});
    await userModel.deleteMany({});
  });

  test("should return only orders belonging to the logged-in user", async () => {
    await orderModel.create({
      products: [product1._id],
      payment: {},
      buyer: user1._id,
      status: "Not Process",
    });

    await orderModel.create({
      products: [product2._id],
      payment: {},
      buyer: user2._id,
      status: "Processing",
    });

    const res = await request(app)
      .get("/api/v1/auth/orders")
      .set("Authorization", user1Token);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);

    expect(res.body[0]).toHaveProperty("_id");
    expect(res.body[0]).toHaveProperty("buyer");
    expect(res.body[0]).toHaveProperty("products");
    expect(res.body[0].buyer).toHaveProperty("name", "User One");
    expect(res.body[0].products).toHaveLength(1);
    expect(res.body[0].products[0]).toHaveProperty("name", "Phone");
  });

  test("should populate buyer name and products in the returned orders", async () => {
    await orderModel.create({
      products: [product1._id, product2._id],
      payment: {},
      buyer: user1._id,
      status: "Not Process",
    });

    const res = await request(app)
      .get("/api/v1/auth/orders")
      .set("Authorization", user1Token);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);

    const order = res.body[0];

    expect(order.buyer).toHaveProperty("name", "User One");
    expect(Array.isArray(order.products)).toBe(true);
    expect(order.products).toHaveLength(2);

    const productNames = order.products.map((p) => p.name);
    expect(productNames).toEqual(
      expect.arrayContaining(["Phone", "Laptop"])
    );
  });

  test("should return an empty array when the logged-in user has no orders", async () => {
    await orderModel.create({
      products: [product2._id],
      payment: {},
      buyer: user2._id,
      status: "Processing",
    });

    const res = await request(app)
      .get("/api/v1/auth/orders")
      .set("Authorization", user1Token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("should reject request when token is missing", async () => {
    const res = await request(app).get("/api/v1/auth/orders");

    expect([401, 403]).toContain(res.status);
  });

  test("should return 500 when database query fails", async () => {
    jest.spyOn(orderModel, "find").mockImplementationOnce(() => {
      throw new Error("DB down");
    });

    const res = await request(app)
      .get("/api/v1/auth/orders")
      .set("Authorization", user1Token);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Error While Getting Orders");
  });
});