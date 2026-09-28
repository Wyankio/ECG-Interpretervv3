# ECG Interpreter Lab

Versi latihan interpretasi ECG menggunakan 12-lead median waveform dari dataset ACS.

## Tampilan ECG
- Layout 12-lead seperti printout ECG klinis: 3 baris x 4 kolom.
- Rhythm strip II ditampilkan sebagai median beat, bukan rekaman 10 detik.
- Grid ECG, 25 mm/s, dan 10 mm/mV ditampilkan sebagai referensi visual.

## Latihan
Urutan: irama → frekuensi → P → PR/AV → QRS → axis → Q → lebar QRS → transition/BBB → LVH/RVH → aritmia.
Setiap tahap memiliki tombol untuk menampilkan jawaban, dan panel bawah menampilkan kunci jawaban kasus.

## Catatan data
File `.med` adalah median waveform 12-lead, bukan raw 10-second ECG. Karena itu rhythm, rate, PAC/PVC, AF, VT, dan VF tidak boleh disimpulkan hanya dari median waveform.
Label STEMI/NSTEMI/OMI/UA dan label klinis lain berasal dari metadata dataset dan tidak otomatis berarti seluruh diagnosis dapat ditegakkan dari waveform saja.
