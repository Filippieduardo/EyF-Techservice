import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (pathname === "/login" || pathname === "/portal/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/portal")) {
    if (!session || (session.user as any).type !== "cliente") {
      return NextResponse.redirect(new URL("/portal/login", req.url));
    }
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/clientes") ||
    pathname.startsWith("/ordenes") ||
    pathname.startsWith("/presupuestos") ||
    pathname.startsWith("/repuestos") ||
    pathname.startsWith("/usuarios")
  ) {
    if (!session || (session.user as any).type !== "staff") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (
      (pathname.startsWith("/usuarios") || pathname.startsWith("/presupuestos") || pathname.startsWith("/categorias") || pathname.startsWith("/clientes")) &&
      (session.user as any).role !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clientes/:path*",
    "/ordenes/:path*",
    "/presupuestos/:path*",
    "/categorias/:path*",
    "/repuestos/:path*",
    "/usuarios/:path*",
    "/portal/:path*",
    "/login",
    "/portal/login",
  ],
};
