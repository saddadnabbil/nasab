import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const Route = createFileRoute("/privacy")({ component: PrivacyPage });

function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privasi"
      title="Data keluargamu tetap milikmu."
      intro="Nasab dirancang agar bisa dipakai secara lokal. Data baru dikirim ke layanan cloud ketika kamu memilih masuk dan menyimpannya ke akun."
    >
      <LegalSection title="Data yang diproses">
        <p>
          Tanpa akun, pohon keluarga, foto, catatan, gambar, dan pengaturan disimpan di penyimpanan
          browser pada perangkatmu. Menghapus data browser dapat menghapus data lokal tersebut.
        </p>
        <p>
          Jika kamu masuk, Nasab memproses identitas dasar dari penyedia login—nama, alamat email,
          foto profil bila tersedia, serta pengenal akun—untuk membuat sesi dan memisahkan pohon
          milik setiap pengguna.
        </p>
      </LegalSection>
      <LegalSection title="Penyimpanan cloud">
        <p>
          Pohon hanya disalin ke database cloud saat kamu memilih tindakan Simpan ke akun. Setiap
          pembacaan, perubahan, dan penghapusan data cloud dibatasi ke akun yang sudah diverifikasi
          oleh server.
        </p>
      </LegalSection>
      <LegalSection title="Pihak ketiga">
        <p>
          Nasab menggunakan layanan hosting, database, autentikasi, dan pengiriman email untuk
          menjalankan produk. Data tidak dijual dan tidak digunakan untuk iklan.
        </p>
      </LegalSection>
      <LegalSection title="Pilihan dan penghapusan">
        <p>
          Kamu dapat menghapus pohon lokal dari perangkat atau menghapus pohon cloud dari halaman
          Kanvas. Untuk permintaan penghapusan akun atau data terkait, hubungi pengelola melalui{" "}
          <a
            className="underline underline-offset-4"
            href="https://github.com/saddadnabbil"
            rel="noreferrer"
            target="_blank"
          >
            profil GitHub Saddad Nabil
          </a>
          .
        </p>
      </LegalSection>
      <LegalSection title="Keamanan dan perubahan">
        <p>
          Koneksi produksi menggunakan HTTPS dan kredensial rahasia hanya diproses di server.
          Kebijakan ini dapat diperbarui ketika fitur atau penyedia layanan berubah; tanggal berlaku
          di atas akan ikut diperbarui.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
