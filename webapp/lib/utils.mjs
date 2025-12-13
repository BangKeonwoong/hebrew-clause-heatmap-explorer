import { dom } from "./dom.mjs";

export function displayBookName(book) {
  return book.replaceAll("_", " ");
}

export function setSelectionInfo(text) {
  dom.selectionInfo.textContent = text;
}

