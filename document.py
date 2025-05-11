import io
import fitz  # PyMuPDF for PDFs
import docx


def extract_text_from_txt(file_bytes):
    return file_bytes.decode('utf-8')


def extract_text_from_pdf(file_bytes):
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    return "\n".join([page.get_text("text") for page in doc])


def extract_text_from_docx(file_bytes):
    file_stream = io.BytesIO(file_bytes)
    doc = docx.Document(file_stream)
    return "\n".join([para.text for para in doc.paragraphs])


def extract_text(file_bytes, filename):
    filename = filename.lower()  # Defensive: case-insensitive extension check
    if filename.endswith(".txt"):
        return extract_text_from_txt(file_bytes)
    elif filename.endswith(".pdf"):
        return extract_text_from_pdf(file_bytes)
    elif filename.endswith(".docx"):
        return extract_text_from_docx(file_bytes)
    else:
        raise ValueError("Unsupported file format. Use TXT, PDF, or DOCX.")
