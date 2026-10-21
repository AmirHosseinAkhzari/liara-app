import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export default async function Products() {
  const products = await prisma.product.findMany();
  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}
