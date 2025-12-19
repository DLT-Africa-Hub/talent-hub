import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  BsTypeBold,
  BsTypeItalic,
  BsListUl,
  BsListOl,
  BsTypeH1,
  BsTypeH2,
} from 'react-icons/bs';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  rows?: number;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter text...',
  label,
  required,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[120px] px-4 py-3 break-words overflow-wrap-anywhere',
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-[#1C1C1C] text-[16px] font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="border border-fade rounded-xl bg-white overflow-hidden flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-2 border-b border-fade bg-[#F8F8F8] shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-[#E0E0E0] transition ${
              editor.isActive('bold') ? 'bg-[#DBFFC0]' : ''
            }`}
            title="Bold"
          >
            <BsTypeBold className="text-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-[#E0E0E0] transition ${
              editor.isActive('italic') ? 'bg-[#DBFFC0]' : ''
            }`}
            title="Italic"
          >
            <BsTypeItalic className="text-[18px]" />
          </button>
          <div className="w-px h-6 bg-fade" />
          <button
            type="button"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            className={`p-2 rounded hover:bg-[#E0E0E0] transition ${
              editor.isActive('heading', { level: 1 }) ? 'bg-[#DBFFC0]' : ''
            }`}
            title="Heading 1"
          >
            <BsTypeH1 className="text-[18px]" />
          </button>
          <button
            type="button"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className={`p-2 rounded hover:bg-[#E0E0E0] transition ${
              editor.isActive('heading', { level: 2 }) ? 'bg-[#DBFFC0]' : ''
            }`}
            title="Heading 2"
          >
            <BsTypeH2 className="text-[18px]" />
          </button>
          <div className="w-px h-6 bg-fade" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-[#E0E0E0] transition ${
              editor.isActive('bulletList') ? 'bg-[#DBFFC0]' : ''
            }`}
            title="Bullet List"
          >
            <BsListUl className="text-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded hover:bg-[#E0E0E0] transition ${
              editor.isActive('orderedList') ? 'bg-[#DBFFC0]' : ''
            }`}
            title="Numbered List"
          >
            <BsListOl className="text-[18px]" />
          </button>
        </div>
        {/* Editor Content - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-[120px]">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};

export default RichTextEditor;
