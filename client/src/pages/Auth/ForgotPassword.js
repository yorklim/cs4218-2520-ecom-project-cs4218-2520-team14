//Name: Shauryan Agrawal
//Student ID: A0265846N

import React, { useState } from "react";
import Layout from "./../../components/Layout";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../../styles/AuthStyles.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

//Name: Shauryan Agrawal
//Student ID: A0265846N  
  const navigate = useNavigate();

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await axios.post("/api/v1/auth/forgot-password", {
        email,
        answer,
        newPassword,
      });

      if (res?.data?.success) {
        toast.success(res?.data?.message || "Password Reset Successfully", {
          duration: 5000,
          icon: "✅",
          style: {
            background: "green",
            color: "white",
          },
        });

        navigate("/login");
      } else {
        toast.error(res?.data?.message || "Password reset failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };
//Name: Shauryan Agrawal
//Student ID: A0265846N
  return (
    <Layout title="Forgot Password - Ecommerce App">
      <div className="form-container" style={{ minHeight: "90vh" }}>
        <form onSubmit={handleSubmit}>
          <h4 className="title">RESET PASSWORD</h4>

          <div className="mb-3">
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control"
              id="exampleInputEmail1"
              placeholder="Enter Your Email"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="mb-3">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="form-control"
              id="exampleInputAnswer1"
              placeholder="What is Your Favorite sports"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="mb-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-control"
              id="exampleInputNewPassword1"
              placeholder="Enter Your New Password"
              required
              disabled={isSubmitting}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "RESETTING..." : "RESET PASSWORD"}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default ForgotPassword;