import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { PDFDocument } from "pdf-lib";
import cors from "cors";

const app = express();
app.use(bodyParser.json({ limit: "10mb" }));
app.use(cors());

/* ============================
   📥 ENDPOINT /zpl-pdf
============================ */
app.post("/zpl-pdf", async (req, res) => {
  try {
    const { id_bombas,tipo } = req.body;
    if (!id_bombas || id_bombas.length === 0) {
      return res.status(400).json({ error: "No se enviaron motores" });
    }

    const pdfDoc = await PDFDocument.create();
     
    for (const id of id_bombas) {
       
      // Generar tipo, potencia y caudal en el servidor
      const tipo_motor = tipo.startsWith("Bomba 0,75HP") ? "0,75HP" : "0,50HP";
      const potencia = tipo.startsWith("Bomba 0,75HP") ? "120 watts" : "109 watts";
      const caudal = tipo.startsWith("Bomba 0,75HP") ? "12 m3/h" : "8 m3/h";
      const numero = id.slice(-6);

      // Generar ZPL dinámico
      const zpl = `
^XA
~TA000
~JSN
^LT0
^MNW
^MTT
^PON
^PMN
^LH0,0
^JMA
^PR5,5
~SD10
^JUS
^LRN
^CI27
^PA0,1,1,0
^XZ
^XA
^MMT
^PW295
^LL591
^LS0
^FO9,11^GB278,568,2^FS
^FO123,14^GB0,284,2^FS
^FT88,36^A0R,25,15^FH\\^CI28^FDProducto:Bomba Autocebante ${tipo_motor}^FS^CI27
^FT57,36^A0R,25,15^FH\\^CI28^FDPotencia:${potencia}^FS^CI27
^FT26,36^A0R,25,15^FH\\^CI28^FDCaudal:${caudal}^FS^CI27
^FO9,295^GB278,0,2^FS
^FT255,0^A0R,25,25^FB297,1,6,C^FH\\^CI28^FDBomba Autocebante\\^FS^CI27
^FT224,0^A0R,25,25^FB297,1,6,C^FH\\^CI28^FDN°:\\^FS^CI27
^FT156,62^A0R,50,63^FH\\^CI28^FD${numero}^FS^CI27
^FT45,573^BQN,2,10
^FH\\^FDLA,${id}^FS
^LRY^FO143,57^GB0,189,59^FS
^LRN
^PQ1,,,Y
^XZ
      `;

      // Convertir ZPL a PNG usando Labelary
      const labelary = await fetch(
        "http://api.labelary.com/v1/printers/12dpmm/labels/0.984252x1.9685/0/",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: zpl,
        }
      );

      if (!labelary.ok) throw new Error(await labelary.text());

      const pngBuffer = Buffer.from(await labelary.arrayBuffer());

      // Agregar imagen al PDF
      const pngImage = await pdfDoc.embedPng(pngBuffer);
      const page = pdfDoc.addPage([pngImage.width, pngImage.height]);
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: pngImage.width,
        height: pngImage.height,
      });
    }

    const pdfBytes = await pdfDoc.save();

    // Enviar PDF al cliente
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=etiquetas.pdf"
    );
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ error: error.toString() });
  }
});

/* ============================
   🚀 INICIAR SERVIDOR
============================ */
const PORT = process.env.PORT || 10001;
app.listen(PORT, () => {
  console.log("Servidor nuevo activo en puerto " + PORT);
});
