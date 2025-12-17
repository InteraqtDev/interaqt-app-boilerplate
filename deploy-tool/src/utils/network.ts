import { networkInterfaces } from "os";

/**
 * 获取本机局域网 IP 地址
 * 优先选择常见的物理网卡接口，跳过虚拟网卡
 *
 * @returns 本机 IP 地址，如果无法检测则返回 'localhost'
 */
export function getLocalIP(): string {
  const nets = networkInterfaces();

  // 常见网卡名称优先级（macOS: en0/en1, Linux: eth0/eth1, Windows: Ethernet/Wi-Fi）
  const priorities = ["en0", "en1", "eth0", "eth1", "Ethernet", "Wi-Fi"];

  // 首先按优先级查找
  for (const name of priorities) {
    const net = nets[name];
    if (net) {
      for (const info of net) {
        if (info.family === "IPv4" && !info.internal) {
          return info.address;
        }
      }
    }
  }

  // 遍历所有接口，找第一个非内部 IPv4
  for (const name of Object.keys(nets)) {
    // 跳过 Docker/Kubernetes 虚拟网卡
    if (
      name.startsWith("docker") ||
      name.startsWith("br-") ||
      name.startsWith("veth") ||
      name.startsWith("cni") ||
      name.startsWith("flannel") ||
      name.startsWith("calico") ||
      name === "lo" ||
      name === "lo0"
    ) {
      continue;
    }

    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }

  return "localhost";
}

/**
 * 构建 publicUrl
 * 使用本机 IP 地址和指定端口构建可从局域网访问的 URL
 *
 * @param port 端口号
 * @param protocol 协议（如 http, ws），为空则不加协议前缀
 * @param localIP 可选，指定 IP 地址，不传则自动检测
 * @returns publicUrl 字符串
 */
export function buildPublicUrl(port: number, protocol?: string, localIP?: string): string {
  const ip = localIP || getLocalIP();
  return protocol ? `${protocol}://${ip}:${port}` : `${ip}:${port}`;
}

