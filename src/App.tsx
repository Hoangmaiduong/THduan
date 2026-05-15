/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { fetchProjectsFromSheet } from './services/googleSheets';
import { ProjectProgress } from './types';
import { 
  FolderKanban, 
  Search, 
  Loader2, 
  FileSpreadsheet, 
  ClipboardList, 
  Save, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const SHEET_ID = '1DcH4OvHrQMMxcAGJtwau-SqdeyzqGZZTcXI3GwqhMy0';
const SHEET_NAME = 'TH tiến độ';

export default function App() {
  const [projects, setProjects] = useState<ProjectProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<ProjectProgress | null>(null);
  const [evaluations, setEvaluations] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Lấy dữ liệu khi load app
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchProjectsFromSheet(SHEET_ID, SHEET_NAME);
        setProjects(data);
        
        // Load các đánh giá đã lưu ở LocalStorage
        const savedEvals = localStorage.getItem('gpmb_evaluations');
        if (savedEvals) {
          setEvaluations(JSON.parse(savedEvals));
        }
      } catch (err) {
        setError('Không thể tải dữ liệu từ Google Sheets. Vui lòng kiểm tra lại quyền chia sẻ file.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.tt.toString().includes(searchTerm)
  );

  const handleSaveEvaluation = () => {
    if (!selectedProject) return;
    setIsSaving(true);
    
    // Lưu tạm vào LocalStorage của trình duyệt
    const newEvaluations = {
      ...evaluations,
      [selectedProject.id]: evaluations[selectedProject.id] || ''
    };
    
    localStorage.setItem('gpmb_evaluations', JSON.stringify(newEvaluations));
    
    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage('Đã lưu đánh giá cục bộ thành công!');
      setTimeout(() => setSaveMessage(''), 3000);
    }, 500);
  };

  const handleEvalChange = (val: string) => {
    if (!selectedProject) return;
    setEvaluations(prev => ({
      ...prev,
      [selectedProject.id]: val
    }));
  };

  const handleAIEvaluation = async () => {
    if (!selectedProject) return;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'undefined') {
      alert("Lỗi: Không tìm thấy API Key. Nếu bạn đang chạy trên Netlify, vui lòng cấu hình environment variable GEMINI_API_KEY trong site settings.");
      return;
    }

    setIsGeneratingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Đóng vai trò là một chuyên gia trong lĩnh vực đất đai, có kinh nghiệm nhiều năm, đặc biệt liên quan đến công tác bồi thường giải phóng mặt bằng (GPMB) để thực hiện dự án.
Trên cơ sở tiến độ thực hiện của dự án dưới đây, hãy đưa ra nhận xét, đánh giá chi tiết tiến độ, cũng như ý kiến chỉ đạo, giải pháp tháo gỡ khó khăn vướng mắc.

- Tên dự án: ${selectedProject.name}
- Lũy kế kết quả thực hiện đến nay: ${selectedProject.luyKe || 'Không có dữ liệu'}
- Nội dung thực hiện trong tuần: ${selectedProject.noiDungTuan || 'Không có dữ liệu'}
- Nhiệm vụ thời gian tới, đề xuất: ${selectedProject.nhiemVuToi || 'Không có dữ liệu'}

Vui lòng viết đánh giá súc tích, đi thẳng vào các vấn đề trọng tâm, đưa ra các chỉ đạo cụ thể mang tính chuyên môn cao, thực tế và khả thi trong công tác GPMB.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const generatedText = response.text || '';
      
      setEvaluations(prev => ({
        ...prev,
        [selectedProject.id]: generatedText
      }));

    } catch (err: any) {
      console.error("AI Error:", err);
      let errorMsg = "Đã xảy ra lỗi khi tạo đánh giá bằng AI.";
      
      if (err.message?.includes("403") || err.message?.includes("PERMISSION_DENIED")) {
        errorMsg += "\n\nLỗi 403: API Key không hợp lệ hoặc không có quyền truy cập model này. Hãy kiểm tra lại key trong Netlify Environment Variables.";
      } else if (err.message?.includes("429")) {
        errorMsg += "\n\nLỗi 429: Hết hạn mức (Quota exceeded). Vui lòng thử lại sau.";
      } else {
        errorMsg += "\n\nChi tiết: " + err.message;
      }
      
      alert(errorMsg);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
        <div className="p-4 border-b border-gray-200 bg-blue-600 text-white">
          <div className="flex items-center gap-2 font-bold text-lg mb-1">
            <FolderKanban size={24} />
            <span>Quản lý GPMB</span>
          </div>
          <p className="text-blue-100 text-xs opacity-90">Theo dõi & Đánh giá Tiến độ</p>
        </div>
        
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm dự án..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Loader2 className="animate-spin mb-2" size={24} />
              <span className="text-sm">Đang tải dữ liệu Sheet...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md m-2 border border-red-100 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center p-4 text-gray-500 text-sm">
              Không tìm thấy dự án nào
            </div>
          ) : (
            <div className="space-y-1">
              {filteredProjects.map(project => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className={`w-full text-left px-3 py-3 rounded-md transition-colors flex items-start gap-3 ${
                    selectedProject?.id === project.id 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                     selectedProject?.id === project.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {project.tt}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      selectedProject?.id === project.id ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {project.name}
                    </p>
                    {evaluations[project.id] ? (
                      <span className="inline-flex mt-1 items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                        Đã đánh giá
                      </span>
                    ) : (
                      <span className="inline-flex mt-1 items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800">
                        Chưa đánh giá
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex items-center gap-2">
          <FileSpreadsheet size={16} />
          <a href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}`} target="_blank" rel="noreferrer" className="hover:text-blue-600 hover:underline">
            Mở Google Sheet gốc
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 flex-shrink-0">
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <ClipboardList className="text-gray-400" />
            Chi tiết dự án & Đánh giá
          </h1>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8">
          {!selectedProject ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <FolderKanban size={64} className="mb-4 opacity-20" />
              <p className="text-lg font-medium text-gray-600">Chưa chọn dự án</p>
              <p className="text-sm mt-1">Vui lòng chọn một dự án từ danh sách bên trái để xem chi tiết.</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold">
                    {selectedProject.tt}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedProject.name}</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Lũy kế kết quả đến nay</h3>
                    <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-800 whitespace-pre-wrap border border-gray-100 leading-relaxed min-h-[60px]">
                      {selectedProject.luyKe || <span className="text-gray-400 italic">Không có dữ liệu</span>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-2">Thực hiện trong tuần</h3>
                      <div className="bg-indigo-50/50 p-4 rounded-md text-sm text-gray-800 whitespace-pre-wrap border border-indigo-100/50 leading-relaxed min-h-[80px]">
                        {selectedProject.noiDungTuan || <span className="text-gray-400 italic">Không có dữ liệu</span>}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-2">Nhiệm vụ tuần tới / Đề xuất</h3>
                      <div className="bg-emerald-50/50 p-4 rounded-md text-sm text-gray-800 whitespace-pre-wrap border border-emerald-100/50 leading-relaxed min-h-[80px]">
                        {selectedProject.nhiemVuToi || <span className="text-gray-400 italic">Không có dữ liệu</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Đánh giá */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Phần mềm Đánh giá & Chỉ đạo</h3>
                  {saveMessage && (
                    <span className="text-sm text-green-600 font-medium animate-pulse">
                      {saveMessage}
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-500 mb-4">
                  Nhập nhận xét, đánh giá tiến độ hoặc ý kiến chỉ đạo đối với dự án này.
                </p>
                
                <textarea
                  className="w-full h-40 p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-4 text-sm leading-relaxed"
                  placeholder="Nhập đánh giá chi tiết..."
                  value={evaluations[selectedProject.id] || ''}
                  onChange={(e) => handleEvalChange(e.target.value)}
                ></textarea>
                
                <div className="flex justify-end items-center gap-4">
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    Lưu ý: Dữ liệu đánh giá hiện đang lưu cục bộ trên trình duyệt.
                  </span>
                  <button
                    onClick={handleAIEvaluation}
                    disabled={isGeneratingAI}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-100 text-indigo-700 rounded-md font-medium hover:bg-indigo-200 transition-colors disabled:opacity-50"
                  >
                    {isGeneratingAI ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    {isGeneratingAI ? 'Đang phân tích...' : 'AI Đánh giá'}
                  </button>
                  <button
                    onClick={handleSaveEvaluation}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {isSaving ? 'Đang lưu...' : 'Lưu đánh giá'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
