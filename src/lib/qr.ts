import "@/lib/serverOnly";
import QRCode from "qrcode";

export async function generatePaymentQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 1, width: 240 });
}
