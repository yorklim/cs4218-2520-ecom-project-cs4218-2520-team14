//Teng Hui Xin Alicia, A0259064Y
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import JWT from "jsonwebtoken";

jest.mock("../config/db.js", () => jest.fn());

import app from "../app.js";
import userModel from "../models/userModel.js";
import { hashPassword, comparePassword } from "../helpers/authHelper.js";

describe("updateProfileController Integration Tests", () => {
  let mongoServer;
  let user;
  let token;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await userModel.deleteMany({});

    const hashedPassword = await hashPassword("oldPassword123");

    user = await userModel.create({
      name: "Old Name",
      email: "user@test.com",
      password: hashedPassword,
      phone: "1111111111",
      address: "Old Address",
      answer: "blue",
      role: 0,
    });

    token = JWT.sign({ _id: user._id }, process.env.JWT_SECRET);
  });

  afterEach(async () => {
    await userModel.deleteMany({});
    jest.restoreAllMocks();
  });

  test("should update profile without changing password when password is empty", async () => {
    const res = await request(app)
      .put("/api/v1/auth/profile")
      .set("Authorization", token)
      .send({
        name: "New Name",
        password: "",
        phone: "9999999999",
        address: "New Address",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.updatedUser.name).toBe("New Name");
    expect(res.body.updatedUser.phone).toBe("9999999999");

    const updatedUser = await userModel.findById(user._id);
    expect(updatedUser.password).toBe(user.password);
  });

  test("should update profile and hash new password when valid password provided", async () => {
    const res = await request(app)
      .put("/api/v1/auth/profile")
      .set("Authorization", token)
      .send({
        password: "newPassword123",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedUser = await userModel.findById(user._id);

    expect(updatedUser.password).not.toBe(user.password);

    const isMatch = await comparePassword(
      "newPassword123",
      updatedUser.password
    );

    expect(isMatch).toBe(true);
  });

  test("should keep existing fields if not provided", async () => {
    const res = await request(app)
      .put("/api/v1/auth/profile")
      .set("Authorization", token)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedUser = await userModel.findById(user._id);

    expect(updatedUser.name).toBe("Old Name");
    expect(updatedUser.phone).toBe("1111111111");
    expect(updatedUser.address).toBe("Old Address");
  }); 

  test("should reject password shorter than 6 characters", async () => {
    const res = await request(app)
      .put("/api/v1/auth/profile")
      .set("Authorization", token)
      .send({
        password: "123",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty(
      "error",
      "Password is required and 6 character long"
    );

    const unchangedUser = await userModel.findById(user._id);
    expect(unchangedUser.password).toBe(user.password);
  });

  test("should reject request without token", async () => {
    const res = await request(app)
      .put("/api/v1/auth/profile")
      .send({ name: "New Name" });

    expect([401, 403]).toContain(res.status);
  });

  test("should return 400 when database fails", async () => {
    jest.spyOn(userModel, "findById").mockImplementationOnce(() => {
      throw new Error("DB down");
    });

    const res = await request(app)
      .put("/api/v1/auth/profile")
      .set("Authorization", token)
      .send({ name: "New Name" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Error While Updating Profile");
  });
});