import { PrismaClient } from "../app/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@techservice.com" },
    update: {},
    create: {
      email: "admin@techservice.com",
      password: adminPassword,
      nombre: "Administrador",
      role: "ADMIN",
    },
  });

  const tecnicoPassword = await bcrypt.hash("tecnico123", 10);
  await prisma.user.upsert({
    where: { email: "tecnico@techservice.com" },
    update: {},
    create: {
      email: "tecnico@techservice.com",
      password: tecnicoPassword,
      nombre: "Técnico Demo",
      role: "TECNICO",
    },
  });

  const marcas = [
    "HP", "Canon", "Epson", "Brother", "Samsung", "Lexmark",
    "Xerox", "Ricoh", "Kyocera", "OKI", "Lenovo", "Dell",
    "Acer", "Asus", "Toshiba", "Sony", "Apple", "Motorola", "Huawei",
  ];

  for (const nombre of marcas) {
    await prisma.marca.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  const categorias = [
    "Tóner", "Fusor", "Cabezal", "Memoria", "Disco / SSD",
    "Batería", "Fuente de alimentación", "Pantalla", "Teclado",
    "Placa madre", "Procesador", "Placa de video", "Cable / Conector", "Otro",
  ];
  for (let i = 0; i < categorias.length; i++) {
    await prisma.categoria.upsert({
      where: { nombre: categorias[i] },
      update: {},
      create: { nombre: categorias[i], orden: i },
    });
  }

  await prisma.cliente.upsert({
    where: { email: "cliente@demo.com" },
    update: {},
    create: {
      nombre: "Cliente Demo",
      email: "cliente@demo.com",
      telefono: "1122334455",
      portalPassword: await bcrypt.hash("cliente123", 10),
    },
  });

  console.log("✅ Seed completado:");
  console.log("   Admin: admin@techservice.com / admin123");
  console.log("   Técnico: tecnico@techservice.com / tecnico123");
  console.log("   Portal cliente: cliente@demo.com / cliente123");
  console.log(`   ${marcas.length} marcas cargadas`);
  console.log(`   ${categorias.length} categorías cargadas`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
