'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText, Plus, MoreVertical } from 'lucide-react';

interface Module {
  id: number;
  name: string;
  moduleId: number;
  questionCount: number;
  icon?: string;
  color?: string;
}

interface CourseFolder {
  id: number;
  name: string;
  courseName: string;
  courseId: number;
  questionCount: number;
  modules: Module[];
  icon?: string;
  color?: string;
}

interface FolderTreeViewProps {
  folders: CourseFolder[];
  onSelectFolder: (folderId: number, type: 'course' | 'module', courseId?: number, moduleId?: number) => void;
  onAddQuestion: (folderId: number, courseId?: number, moduleId?: number) => void;
  selectedFolderId?: number;
}

export default function FolderTreeView({
  folders,
  onSelectFolder,
  onAddQuestion,
  selectedFolderId,
}: FolderTreeViewProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

  const toggleFolder = (folderId: number) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Q-Bank Organization</h2>
            <p className="text-sm text-purple-100 mt-1">Course and module folders</p>
          </div>
          <button
            onClick={() => onAddQuestion(0)}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"
          >
            <Plus size={18} />
            <span className="text-sm font-medium">New Question</span>
          </button>
        </div>
      </div>

      {/* Folder Tree */}
      <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
        {folders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Folder size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No course folders yet</p>
            <p className="text-sm mt-2">Create a course to get started!</p>
          </div>
        ) : (
          folders.map((folder) => (
            <div key={folder.id} className="space-y-1">
              {/* Course Folder */}
              <div
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  selectedFolderId === folder.id
                    ? 'bg-purple-50 border border-purple-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <button
                  onClick={() => toggleFolder(folder.id)}
                  className="p-1 hover:bg-gray-200 rounded transition"
                >
                  {expandedFolders.has(folder.id) ? (
                    <ChevronDown size={16} className="text-gray-600" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-600" />
                  )}
                </button>

                <div
                  onClick={() => onSelectFolder(folder.id, 'course', folder.courseId)}
                  className="flex items-center gap-2 flex-1"
                >
                  <span className="text-2xl">{folder.icon || '📚'}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{folder.courseName}</p>
                    <p className="text-xs text-gray-500">{folder.questionCount} questions</p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddQuestion(folder.id, folder.courseId);
                  }}
                  className="p-1.5 hover:bg-purple-100 rounded transition"
                  title="Add question to course"
                >
                  <Plus size={16} className="text-purple-600" />
                </button>
              </div>

              {/* Module Folders */}
              {expandedFolders.has(folder.id) && (
                <div className="ml-8 space-y-1">
                  {folder.modules.length === 0 ? (
                    <div className="text-sm text-gray-400 px-3 py-2">
                      No modules yet - add modules to this course
                    </div>
                  ) : (
                    folder.modules.map((module) => (
                      <div
                        key={module.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          selectedFolderId === module.id
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                        onClick={() =>
                          onSelectFolder(module.id, 'module', folder.courseId, module.moduleId)
                        }
                      >
                        <span className="text-xl">{module.icon || '📂'}</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{module.name}</p>
                          <p className="text-xs text-gray-500">{module.questionCount} questions</p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddQuestion(module.id, folder.courseId, module.moduleId);
                          }}
                          className="p-1 hover:bg-blue-100 rounded transition"
                          title="Add question to module"
                        >
                          <Plus size={14} className="text-blue-600" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer Stats */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{folders.length} course folders</span>
          <span>
            {folders.reduce((sum, f) => sum + f.modules.length, 0)} module folders
          </span>
          <span className="font-semibold text-purple-600">
            {folders.reduce((sum, f) => sum + f.questionCount, 0)} total questions
          </span>
        </div>
      </div>
    </div>
  );
}

