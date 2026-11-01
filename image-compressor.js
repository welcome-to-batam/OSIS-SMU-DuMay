/**
 * IMAGE COMPRESSOR
 * OSIS SMU DuMay
 *
 * Maksimal lebar/tinggi: 1200 px
 * Format hasil: JPEG
 * Kualitas: 75%
 */

export function compressImage(file, options = {}) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof File)) {
      reject(new Error("File foto tidak valid."));
      return;
    }

    if (!file.type.startsWith("image/")) {
      reject(new Error("File harus berupa gambar."));
      return;
    }

    const maxWidth = options.maxWidth || 1200;
    const maxHeight = options.maxHeight || 1200;
    const quality = options.quality || 0.75;

    const image = new Image();
    const objectURL = URL.createObjectURL(file);

    image.onload = () => {
      try {
        let width = image.naturalWidth;
        let height = image.naturalHeight;

        // Pertahankan rasio foto
        const ratio = Math.min(
          maxWidth / width,
          maxHeight / height,
          1
        );

        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Tidak dapat memproses foto.");
        }

        // Latar putih untuk menghindari transparansi hitam
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);

        context.drawImage(image, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectURL);

            if (!blob) {
              reject(new Error("Gagal mengompres foto."));
              return;
            }

            const compressedFile = new File(
              [blob],
              "osis-" + Date.now() + ".jpg",
              {
                type: "image/jpeg",
                lastModified: Date.now()
              }
            );

            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );

      } catch (error) {
        URL.revokeObjectURL(objectURL);
        reject(error);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectURL);
      reject(new Error("Foto tidak dapat dibaca."));
    };

    image.src = objectURL;
  });
}
