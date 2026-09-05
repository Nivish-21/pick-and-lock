import { QRCodeSVG } from "qrcode.react";
import "../styles/room-qr.css";

type RoomQrCodeProps = {
  roomUrl: string;
  label?: string;
};

export function RoomQrCode({ roomUrl, label }: RoomQrCodeProps) {
  return (
    <section className="room-qr">
      <QRCodeSVG
        bgColor="var(--surface)"
        fgColor="var(--ink)"
        level="M"
        marginSize={4}
        size={176}
        title={label ?? "Room share QR code"}
        value={roomUrl}
      />
      <p>Share this room</p>
      <code>{roomUrl}</code>
    </section>
  );
}
