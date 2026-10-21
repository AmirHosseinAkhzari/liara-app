import { useQuery } from "@tanstack/react-query";
export default function App() {
  const { data } = useQuery({ queryKey: ["stats"], queryFn: () => fetch(import.meta.env.VITE_API_URL + "/stats").then(r => r.json()) });
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
