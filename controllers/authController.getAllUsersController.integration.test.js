//Teng Hui Xin Alicia, A0259064Y
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import JWT from "jsonwebtoken";

import app from "../app.js";
import userModel from "../models/userModel.js";
import { hashPassword } from "../helpers/authHelper.js";

describe("getAllUsersController Integration Tests", () => {
  let mongoServer;
  let adminUser;
  let normalUser;
  let adminToken;
  let normalToken;

  beforeAll(async () => {
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
    await userModel.deleteMany({});

    const hashedPassword = await hashPassword("password123");

    normalUser = await userModel.create({
      name: "Normal User",
      email: "user@test.com",
      password: hashedPassword,
      phone: "1111111111",
      address: "User Address",
      answer: "blue",
      role: 0,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    adminUser = await userModel.create({
      name: "Admin User",
      email: "admin@test.com",
      password: hashedPassword,
      phone: "2222222222",
      address: "Admin Address",
      answer: "red",
      role: 1,
    });

    adminToken = JWT.sign({ _id: adminUser._id }, process.env.JWT_SECRET);

    normalToken = JWT.sign({ _id: normalUser._id }, process.env.JWT_SECRET);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await userModel.deleteMany({});
  });

  test("should return all users without password fields", async () => {
    const res = await request(app)
      .get("/api/v1/auth/users")
      .set("Authorization", adminToken);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);

    expect(res.body[0]).toHaveProperty("_id");
    expect(res.body[0]).toHaveProperty("name");
    expect(res.body[0]).toHaveProperty("email");
    expect(res.body[0]).toHaveProperty("phone");
    expect(res.body[0]).toHaveProperty("address");
    expect(res.body[0]).toHaveProperty("role");
    expect(res.body[0]).not.toHaveProperty("password");

    expect(res.body[1]).toHaveProperty("_id");
    expect(res.body[1]).toHaveProperty("name");
    expect(res.body[1]).toHaveProperty("email");
    expect(res.body[1]).toHaveProperty("phone");
    expect(res.body[1]).toHaveProperty("address");
    expect(res.body[1]).toHaveProperty("role");
    expect(res.body[1]).not.toHaveProperty("password");

    const emails = res.body.map((user) => user.email);
    expect(emails).toEqual(
      expect.arrayContaining(["user@test.com", "admin@test.com"]),
    );
  });

  test("should return users sorted by createdAt descending", async () => {
    const res = await request(app)
      .get("/api/v1/auth/users")
      .set("Authorization", adminToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    expect(res.body[0].email).toBe("admin@test.com");
    expect(res.body[1].email).toBe("user@test.com");
  });

  test("should return only the admin user when there are no non-admin users", async () => {
    await userModel.deleteMany({ role: 0 });

    const res = await request(app)
      .get("/api/v1/auth/users")
      .set("Authorization", adminToken);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].email).toBe("admin@test.com");
    expect(res.body[0]).not.toHaveProperty("password");
  });

  test("should reject request when token is missing", async () => {
    const res = await request(app).get("/api/v1/auth/users");

    expect([401, 403]).toContain(res.status);
  });

  test("should reject non-admin user", async () => {
    const res = await request(app)
      .get("/api/v1/auth/users")
      .set("Authorization", normalToken);

    expect([401, 403]).toContain(res.status);
  });

  test("should return 500 when database query fails", async () => {
    jest.spyOn(userModel, "find").mockImplementationOnce(() => {
      throw new Error("DB down");
    });

    const res = await request(app)
      .get("/api/v1/auth/users")
      .set("Authorization", adminToken);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: "Error while getting users",
      error: {},
    });
  });
});
