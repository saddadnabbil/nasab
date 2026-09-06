import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const Route = createFileRoute("/terms")({ component: TermsPage });

function TermsPage() {
  return (
    <LegalPage
      eyebrow="Ketentuan"
      title="Gunakan Nasab dengan penuh tanggung jawab."
      intro="Ketentuan singkat ini menjaga Nasab tetap menjadi ruang yang aman untuk merawat sejarah dan hubungan keluarga."
    >
      <LegalSection title="Penggunaan layanan">
        <p>
          Kamu bertanggung jawab atas keakuratan dan hak penggunaan semua nama, foto, catatan, serta
          informasi keluarga yang dimasukkan. Jangan unggah data sensitif tanpa izin orang yang
          terkait.
        </p>
      </LegalSection>
      <LegalSection title="Akun">
        <p>
          Jaga keamanan akses akunmu. Aktivitas yang terjadi melalui sesi akun dianggap dilakukan
          oleh pemilik akun kecuali segera dilaporkan sebagai akses tanpa izin.
        </p>
      </LegalSection>
      <LegalSection title="Ketersediaan dan cadangan">
        <p>
          Nasab disediakan sebagaimana adanya. Walaupun kami berusaha menjaga layanan tetap
          tersedia, simpan ekspor JSON secara berkala sebagai cadangan independen.
        </p>
      </LegalSection>
      <LegalSection title="Konten dan perilaku">
        <p>
          Dilarang menggunakan layanan untuk konten melanggar hukum, menyalahgunakan identitas orang
          lain, mengganggu sistem, atau mencoba mengakses data milik akun lain.
        </p>
      </LegalSection>
      <LegalSection title="Perubahan layanan">
        <p>
          Fitur dan ketentuan dapat berubah seiring pengembangan. Perubahan penting akan tercermin
          pada halaman ini beserta tanggal berlaku yang baru.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
