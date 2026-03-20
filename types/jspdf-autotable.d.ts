declare module "jspdf-autotable" {
  import { jsPDF } from "jspdf"

  // Minimal options shape used in this project; keep index signature to stay flexible
  export interface UserOptions {
    startY?: number
    head?: any[][]
    body?: any[][]
    styles?: any
    margin?: { left?: number; right?: number; top?: number; bottom?: number }
    [key: string]: any
  }

  // The plugin function signature: returns the same jsPDF instance
  export default function autoTable(doc: jsPDF, options: UserOptions): jsPDF
}
