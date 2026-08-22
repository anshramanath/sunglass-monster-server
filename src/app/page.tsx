"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth";
import { getAllBrands } from "@/lib/brand";

const BRANDS = getAllBrands();

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn(email, password);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6 box-border">
      <div className="w-full max-w-[380px]">
        <div className="flex items-center justify-center gap-3 mb-10">
          {BRANDS.map((brand) => (
            <img
              key={brand.slug}
              src={brand.logo}
              alt={brand.name}
              className="h-[22px] w-auto object-contain"
            />
          ))}
        </div>

        <div className="text-center mb-9">
          <div className="text-[28px] font-normal tracking-[-0.01em] mb-2 text-black">
            Admin Sign In
          </div>
          <div className="text-[14px] text-[#737373]">
            Manage products, orders and categories across all brands.
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 mb-6">
            <div>
              <label className="block text-[11px] font-medium tracking-[0.04em] uppercase text-[#737373] mb-1.5">
                Email
              </label>
              <input
                type="email"
                placeholder="sunglassgod@shades.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-11 border border-[#e5e5e5] px-3 text-[14px] text-black placeholder:text-[#a3a3a3] outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium tracking-[0.04em] uppercase text-[#737373] mb-1.5">
                Password
              </label>
              <input
                type="password"
                placeholder="ilovesunglasses123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-11 border border-[#e5e5e5] px-3 text-[14px] text-black placeholder:text-[#a3a3a3] outline-none focus:border-black"
              />
            </div>
          </div>

          {error && (
            <p className="text-[13px] text-red-600 mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-black text-white text-[14px] font-medium disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
