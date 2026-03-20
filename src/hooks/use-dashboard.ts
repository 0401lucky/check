import useSWR from "swr";
import type { DashboardData } from "@/lib/checker/types";

async function fetcher(url: string): Promise<DashboardData> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`请求失败: ${res.status}`);
  }
  const data = await res.json();
  // 校验返回数据结构
  if (!data || !Array.isArray(data.groups)) {
    throw new Error("返回数据格式异常");
  }
  return data;
}

export function useDashboard() {
  const { data, error, isLoading, mutate } = useSWR<DashboardData>(
    "/api/dashboard",
    fetcher,
    {
      refreshInterval: 30_000,
      revalidateOnFocus: true,
    }
  );

  return { data, error, isLoading, mutate };
}
