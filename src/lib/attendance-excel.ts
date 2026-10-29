export type AttendanceExcelRow = {
  dateLabel: string;
  name: string;
  group: string;
  timeIn: string;
  timeOut: string;
  hours?: string;
  status: string;
  rowType: string;
};

type WorkbookOptions = {
  rows: AttendanceExcelRow[];
  groups?: Array<[string, AttendanceExcelRow[]]>;
  groupBy?: "date" | "teacher" | "group";
  isDtr: boolean;
  startDate: string;
  endDate: string;
};

export function parseHoursToMinutes(hStr?: string): number {
  if (!hStr || hStr === "—" || hStr === "In Progress") return 0;
  const match = hStr.match(/(\d+)\s*h(?:ours?)?(?:\s*(\d+)\s*m)?/i);
  if (match) {
    const h = parseInt(match[1], 10) || 0;
    const m = parseInt(match[2] || "0", 10) || 0;
    return h * 60 + m;
  }
  const dec = parseFloat(hStr);
  if (!isNaN(dec)) return Math.round(dec * 60);
  return 0;
}

export function formatMinutesToHM(mins: number): string {
  if (!mins) return "0h 00m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

const xmlEscape = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const columnName = (column: number) => {
  let name = "";
  for (let n = column; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
};

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

// A tiny uncompressed ZIP writer keeps this browser-only export dependency free.
const zipFiles = (files: Array<[string, string]>) => {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const [path, content] of files) {
    const name = encoder.encode(path);
    const data = encoder.encode(content);
    const checksum = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, name.length, true);
    local.set(name, 30);
    localParts.push(local, data);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, localOffset, true);
    central.set(name, 46);
    centralParts.push(central);
    localOffset += local.length + data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, localOffset, true);

  const outputBuffer = new ArrayBuffer(localOffset + centralSize + end.length);
  const output = new Uint8Array(outputBuffer);
  let cursor = 0;
  for (const part of [...localParts, ...centralParts, end]) {
    output.set(part, cursor);
    cursor += part.length;
  }

  return new Blob([outputBuffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};

export function downloadAttendanceWorkbook({
  rows,
  groups,
  groupBy = "date",
  isDtr,
  startDate,
  endDate,
}: WorkbookOptions) {
  const headers = isDtr
    ? ["Date", "Employee", "Room / Group", "Time In", "Time Out", "Hours", "Remarks"]
    : ["Date", "Teacher Name", "Group", "Time In", "Time Out", "Hours", "Status"];
  const columnCount = headers.length;
  const lastColumn = columnName(columnCount);
  const sheetRows: Array<{ cells: string[]; kind: string; row?: AttendanceExcelRow; stripe?: boolean }> = [
    { cells: ["MERRY EXPLORERS  |  LEARNING CENTER"], kind: "title" },
    { cells: [isDtr ? "EMPLOYEE DAILY TIME RECORD" : "ATTENDANCE REPORT"], kind: "subtitle" },
    { cells: [`${startDate}  —  ${endDate}`], kind: "subtitle" },
  ];

  const totalMins = rows.reduce((acc, row) => acc + parseHoursToMinutes(row.hours), 0);
  const totalHoursFormatted = formatMinutesToHM(totalMins);

  const count = rows.filter((row) => row.rowType === "normal").length;
  const onTime = rows.filter((row) => row.status.toLowerCase().includes("on time")).length;
  const late = rows.filter((row) => row.status.toLowerCase().includes("late")).length;
  const absent = rows.filter((row) => row.status.toLowerCase().includes("absent")).length;
  const special = rows.filter((row) => row.rowType === "holiday" || row.rowType === "suspension").length;

  if (!isDtr) {
    sheetRows.push({
      cells: [
        `${totalHoursFormatted} TOTAL HOURS`,
        `${count} RECORDS`,
        `${onTime} ON TIME`,
        `${late} LATE`,
        `${absent} ABSENT`,
        `${special} SPECIAL / OFF`,
      ],
      kind: "summary",
    });
  } else {
    sheetRows.push({
      cells: [
        `${totalHoursFormatted} TOTAL HOURS`,
        `${rows.filter((r) => r.timeIn && r.timeIn !== "—").length} DAYS PRESENT`,
        `${late} LATE`,
        `${absent} ABSENT`,
        `${special} OFF / SUSPENDED`,
      ],
      kind: "summary",
    });
  }
  sheetRows.push({ cells: [], kind: "blank" });

  const appendHeader = () => sheetRows.push({ cells: headers, kind: "header" });
  const appendData = (row: AttendanceExcelRow, index: number) => {
    const cells = [
      row.dateLabel,
      row.name,
      row.group,
      row.timeIn,
      row.timeOut,
      row.hours || "—",
      row.status,
    ];
    sheetRows.push({
      cells,
      kind: row.rowType === "norecord" ? "muted" : "data",
      row,
      stripe: index % 2 === 1,
    });
  };

  const appendTotalRow = (rowList: AttendanceExcelRow[]) => {
    const subMins = rowList.reduce((acc, r) => acc + parseHoursToMinutes(r.hours), 0);
    const subLate = rowList.filter((r) => r.status.toLowerCase().includes("late")).length;
    sheetRows.push({
      cells: [
        "TOTAL",
        "",
        "",
        "",
        "",
        formatMinutesToHM(subMins),
        subLate > 0 ? `${subLate} Late` : "0 Late",
      ],
      kind: "total",
    });
  };

  if (isDtr) {
    appendHeader();
    rows.forEach(appendData);
    appendTotalRow(rows);
  } else if (groupBy === "date") {
    appendHeader();
    rows.forEach(appendData);
    appendTotalRow(rows);
  } else {
    for (const [groupName, groupRows] of groups ?? []) {
      sheetRows.push({ cells: [groupName], kind: "section" });
      appendHeader();
      groupRows.forEach(appendData);
      appendTotalRow(groupRows);
      sheetRows.push({ cells: [], kind: "blank" });
    }
  }

  const rowXml = sheetRows
    .map((row, index) => {
      const rowNumber = index + 1;
      const styleFor = (columnIndex: number) => {
        if (row.kind === "title") return 1;
        if (row.kind === "subtitle") return rowNumber === 2 ? 2 : 3;
        if (row.kind === "summary") {
          return [4, 4, 14, 15, 16, 17, 18][columnIndex] ?? 4;
        }
        if (row.kind === "section") return 5;
        if (row.kind === "header") return 6;
        if (row.kind === "muted") return 9;
        if (row.kind === "total") {
          if (columnIndex === 5) return 20; // Hours bold center
          if (columnIndex === 6) return 21; // Late count bold center
          return 19; // Label with double bottom line
        }
        if (row.kind === "data" && columnIndex === 5) {
          // Hours column
          return row.stripe ? 8 : 7;
        }
        if (row.kind === "data" && columnIndex === headers.length - 1) {
          const status = row.row?.status.toLowerCase() ?? "";
          if (status.includes("late")) return 11;
          if (status.includes("absent")) return 12;
          if (status.includes("holiday") || status.includes("suspend")) return 13;
          if (status.includes("complete") || status.includes("on time") || status.includes("exempt")) return 10;
        }
        return row.stripe ? 8 : 7;
      };

      const cells = row.cells
        .map((value, columnIndex) => {
          if (!value) return "";
          const ref = `${columnName(columnIndex + 1)}${rowNumber}`;
          return `<c r="${ref}" s="${styleFor(columnIndex)}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
        })
        .join("");
      const height =
        row.kind === "title"
          ? 34
          : row.kind === "header"
          ? 25
          : row.kind === "section"
          ? 27
          : row.kind === "summary"
          ? 27
          : row.kind === "total"
          ? 26
          : row.kind === "blank"
          ? 9
          : 22;
      return `<row r="${rowNumber}" ht="${height}" customHeight="1">${cells}</row>`;
    })
    .join("");

  const merges = [1, 2, 3].map((r) => `<mergeCell ref="A${r}:${lastColumn}${r}"/>`);
  sheetRows.forEach((row, index) => {
    if (row.kind === "section") {
      merges.push(`<mergeCell ref="A${index + 1}:${lastColumn}${index + 1}"/>`);
    } else if (row.kind === "total") {
      merges.push(`<mergeCell ref="A${index + 1}:E${index + 1}"/>`);
    }
  });

  const widths = [22, 28, 20, 13, 13, 13, 24];
  const columnsXml = widths
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join("");
  const freezeRow = isDtr || groupBy !== "date" ? 5 : 6;
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="${freezeRow}" topLeftCell="A${freezeRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${columnsXml}</cols><sheetData>${rowXml}</sheetData><mergeCells count="${merges.length}">${merges.join("")}</mergeCells><printOptions horizontalCentered="1"/><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <fonts count="10">
      <font><sz val="11"/><name val="Aptos"/><color rgb="FF26364B"/></font>
      <font><b/><sz val="16"/><name val="Aptos Display"/><color rgb="FFFFFFFF"/></font>
      <font><b/><sz val="12"/><name val="Aptos"/><color rgb="FF003399"/></font>
      <font><sz val="10"/><name val="Aptos"/><color rgb="FF60738F"/></font>
      <font><b/><sz val="10"/><name val="Aptos"/><color rgb="FFFFFFFF"/></font>
      <font><b/><sz val="10"/><name val="Aptos"/><color rgb="FF26734D"/></font>
      <font><b/><sz val="10"/><name val="Aptos"/><color rgb="FF8A5C00"/></font>
      <font><b/><sz val="10"/><name val="Aptos"/><color rgb="FFB42318"/></font>
      <font><b/><sz val="10"/><name val="Aptos"/><color rgb="FFC2410C"/></font>
      <font><b/><sz val="11"/><name val="Aptos"/><color rgb="FF002F76"/></font>
    </fonts>
    <fills count="12">
      <fill><patternFill patternType="none"/></fill>
      <fill><patternFill patternType="gray125"/></fill>
      <fill><patternFill patternType="solid"><fgColor rgb="FF003399"/><bgColor indexed="64"/></patternFill></fill>
      <fill><patternFill patternType="solid"><fgColor rgb="FFEAF2FF"/><bgColor indexed="64"/></patternFill></fill>
      <fill><patternFill patternType="solid"><fgColor rgb="FFF5F8FC"/><bgColor indexed="64"/></patternFill></fill>
      <fill><patternFill patternType="solid"><fgColor rgb="FF0066CC"/><bgColor indexed="64"/></patternFill></fill>
      <fill><patternFill patternType="solid"><fgColor rgb="FFFFF7E0"/><bgColor indexed="64"/></patternFill></fill>
      <fill><patternFill patternType="solid"><fgColor rgb="FFFFEFEA"/><bgColor indexed="64"/></patternFill></fill>
      <fill><patternFill patternType="solid"><fgColor rgb="FFEAF7EF"/><bgColor indexed="64"/></patternFill></fill>
      <fill><patternFill patternType="solid"><fgColor rgb="FFFFF6D9"/><bgColor indexed="64"/></patternFill></fill>
      <fill><patternFill patternType="solid"><fgColor rgb="FFFFECEB"/><bgColor indexed="64"/></patternFill></fill>
      <fill><patternFill patternType="solid"><fgColor rgb="FFFFEFEA"/><bgColor indexed="64"/></patternFill></fill>
    </fills>
    <borders count="4">
      <border><left/><right/><top/><bottom/><diagonal/></border>
      <border><left/><right/><top/><bottom style="thin"><color rgb="FFE4EAF2"/></bottom><diagonal/></border>
      <border><left style="medium"><color rgb="FFFFCC00"/></left><right/><top/><bottom/><diagonal/></border>
      <border><left/><right/><top style="thin"><color rgb="FF003399"/></top><bottom style="double"><color rgb="FF003399"/></bottom><diagonal/></border>
    </borders>
    <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
    <cellXfs count="22">
      <xf xfId="0" fontId="0" fillId="0" borderId="0"/>
      <xf xfId="0" fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>
      <xf xfId="0" fontId="2" fillId="0" borderId="0" applyFont="1" applyAlignment="1"><alignment vertical="center" horizontal="left" indent="1"/></xf>
      <xf xfId="0" fontId="3" fillId="0" borderId="0" applyFont="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>
      <xf xfId="0" fontId="2" fillId="3" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>
      <xf xfId="0" fontId="2" fillId="3" borderId="2" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>
      <xf xfId="0" fontId="4" fillId="2" borderId="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
      <xf xfId="0" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
      <xf xfId="0" fontId="0" fillId="4" borderId="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
      <xf xfId="0" fontId="3" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/>
      <xf xfId="0" fontId="5" fillId="8" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
      <xf xfId="0" fontId="6" fillId="9" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
      <xf xfId="0" fontId="7" fillId="10" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
      <xf xfId="0" fontId="8" fillId="11" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
      <xf xfId="0" fontId="5" fillId="8" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center"/></xf>
      <xf xfId="0" fontId="6" fillId="9" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center"/></xf>
      <xf xfId="0" fontId="7" fillId="10" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center"/></xf>
      <xf xfId="0" fontId="6" fillId="6" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center"/></xf>
      <xf xfId="0" fontId="8" fillId="7" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center"/></xf>
      <xf xfId="0" fontId="9" fillId="3" borderId="3" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="right" indent="1"/></xf>
      <xf xfId="0" fontId="2" fillId="3" borderId="3" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center"/></xf>
      <xf xfId="0" fontId="6" fillId="3" borderId="3" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center"/></xf>
    </cellXfs>
    <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  </styleSheet>`;
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${isDtr ? "DTR" : "Attendance"}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const files: Array<[string, string]> = [
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", workbookXml],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/styles.xml", stylesXml],
    ["xl/worksheets/sheet1.xml", sheetXml],
  ];

  const filename = isDtr
    ? `DTR_${(rows[0]?.name || "Employee").replace(/[^a-z0-9]+/gi, "_")}_${startDate}_to_${endDate}.xlsx`
    : `Attendance_Report_${startDate}_to_${endDate}.xlsx`;
  const url = URL.createObjectURL(zipFiles(files));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
