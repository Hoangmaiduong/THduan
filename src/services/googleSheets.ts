import { ProjectProgress } from '../types';

/**
 * Lấy dữ liệu từ Google Sheet công khai thông qua Google Visualization API (không cần API Key).
 */
export async function fetchProjectsFromSheet(sheetId: string, sheetName: string): Promise<ProjectProgress[]> {
  // Điểm cuối (endpoint) gviz cho phép đọc dữ liệu công khai từ Google Sheets dưới dạng JSON
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  
  try {
    const res = await fetch(url);
    const text = await res.text();
    
    // Phản hồi có dạng /*O_o*/ google.visualization.Query.setResponse({...})
    // Cần dùng regex để tách lấy phần JSON
    const jsonString = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\)/);
    
    if (jsonString && jsonString[1]) {
      const data = JSON.parse(jsonString[1]);
      const rows = data.table.rows;
      
      const projects: ProjectProgress[] = rows.map((row: any, index: number) => {
        return {
          id: `proj-${index}`,
          tt: row.c[0]?.v || '',
          name: row.c[1]?.v || '',
          luyKe: row.c[2]?.v || '',
          noiDungTuan: row.c[3]?.v || '',
          nhiemVuToi: row.c[4]?.v || '',
        };
      });

      // Lọc bỏ các hàng trống (không có tên dự án) hoặc hàng tiêu đề nếu bị dính
      return projects.filter(p => p.name && p.name.trim() !== '' && p.name !== 'Dự án');
    }
    return [];
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu từ Google Sheets", error);
    throw error;
  }
}
