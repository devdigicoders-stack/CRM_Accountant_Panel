// src/components/RichTextEditor.jsx
import { useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  FaBold, 
  FaItalic, 
  FaUnderline, 
  FaListUl, 
  FaListOl, 
  FaLink, 
  FaAlignLeft, 
  FaAlignCenter, 
  FaAlignRight,
  FaCode,
  FaUndo,
  FaRedo
} from 'react-icons/fa';

const RichTextEditor = ({ value, onChange, placeholder = "Start writing..." }) => {
  const { themeColors } = useTheme();
  const editorRef = useRef(null);
  const isCodeView = useRef(false);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current.focus();
    handleContentChange();
  };

  const handleContentChange = () => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const toggleCodeView = () => {
    if (!editorRef.current) return;
    
    if (isCodeView.current) {
      // Switch from code to visual
      const htmlContent = editorRef.current.textContent;
      editorRef.current.innerHTML = htmlContent;
      editorRef.current.contentEditable = true;
      isCodeView.current = false;
    } else {
      // Switch from visual to code
      const htmlContent = editorRef.current.innerHTML;
      editorRef.current.textContent = htmlContent;
      editorRef.current.contentEditable = true;
      isCodeView.current = true;
    }
    handleContentChange();
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const toolbarButtons = [
    { icon: FaUndo, command: 'undo', title: 'Undo' },
    { icon: FaRedo, command: 'redo', title: 'Redo' },
    { type: 'separator' },
    { icon: FaBold, command: 'bold', title: 'Bold' },
    { icon: FaItalic, command: 'italic', title: 'Italic' },
    { icon: FaUnderline, command: 'underline', title: 'Underline' },
    { type: 'separator' },
    { icon: FaListUl, command: 'insertUnorderedList', title: 'Bullet List' },
    { icon: FaListOl, command: 'insertOrderedList', title: 'Numbered List' },
    { type: 'separator' },
    { icon: FaAlignLeft, command: 'justifyLeft', title: 'Align Left' },
    { icon: FaAlignCenter, command: 'justifyCenter', title: 'Align Center' },
    { icon: FaAlignRight, command: 'justifyRight', title: 'Align Right' },
    { type: 'separator' },
    { icon: FaLink, action: insertLink, title: 'Insert Link' },
    { icon: FaCode, action: toggleCodeView, title: 'Code View' },
  ];

  return (
    <div
      className="border rounded-lg overflow-hidden"
      style={{ borderColor: themeColors.border }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-1 p-2 border-b"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        {toolbarButtons.map((button, index) => {
          if (button.type === 'separator') {
            return (
              <div
                key={index}
                className="w-px h-6 mx-1"
                style={{ backgroundColor: themeColors.border }}
              />
            );
          }

          const Icon = button.icon;
          return (
            <button
              key={index}
              type="button"
              onClick={() => {
                if (button.action) {
                  button.action();
                } else {
                  execCommand(button.command);
                }
              }}
              className="p-2 rounded hover:bg-opacity-80 transition-colors"
              style={{
                color: themeColors.text,
                backgroundColor: 'transparent',
              }}
              title={button.title}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = themeColors.border;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <Icon className="text-sm" />
            </button>
          );
        })}

        {/* Format Dropdown */}
        <select
          onChange={(e) => {
            if (e.target.value) {
              execCommand('formatBlock', e.target.value);
              e.target.value = '';
            }
          }}
          className="ml-2 px-2 py-1 rounded border text-sm"
          style={{
            backgroundColor: themeColors.background,
            borderColor: themeColors.border,
            color: themeColors.text,
          }}
        >
          <option value="">Format</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="p">Paragraph</option>
        </select>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleContentChange}
        onBlur={handleContentChange}
        className="p-4 min-h-[300px] focus:outline-none"
        style={{
          backgroundColor: themeColors.background,
          color: themeColors.text,
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: ${themeColors.text}60;
          font-style: italic;
        }
        [contenteditable] h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0.5em 0;
        }
        [contenteditable] h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 0.5em 0;
        }
        [contenteditable] h3 {
          font-size: 1.2em;
          font-weight: bold;
          margin: 0.5em 0;
        }
        [contenteditable] p {
          margin: 0.5em 0;
        }
        [contenteditable] ul, [contenteditable] ol {
          margin: 0.5em 0;
          padding-left: 2em;
        }
        [contenteditable] a {
          color: ${themeColors.primary};
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;