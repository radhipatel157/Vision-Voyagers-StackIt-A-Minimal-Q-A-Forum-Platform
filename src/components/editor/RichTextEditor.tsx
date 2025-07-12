import { useEffect, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', 
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', 
  '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭',
  '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
  '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
  '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎',
  '🤓', '🧐', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙',
  '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋',
  '🤝', '👏', '🙌', '👐', '🤲', '🤜', '🤛', '✊', '👊', '🤏'
];

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Write your content...",
  className = ""
}: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const insertEmoji = (emoji: string) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection();
      if (range) {
        quill.insertText(range.index, emoji);
        quill.setSelection(range.index + emoji.length);
      }
    }
    setShowEmojiPicker(false);
  };

  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        ['link', 'image', 'video'],
        ['blockquote', 'code-block'],
        ['clean']
      ]
    },
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'align', 'color', 'background',
    'code-block'
  ];

  return (
    <div className={`relative animate-fade-in ${className}`}>
      <div className="relative">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          style={{
            backgroundColor: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            borderRadius: '8px',
            minHeight: '200px'
          }}
        />
        
        {/* Custom Emoji Button */}
        <div className="absolute top-2 right-2 z-10 animate-scale-in">
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover-scale transition-all duration-200"
                type="button"
              >
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2 animate-fade-in">
              <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                {EMOJI_LIST.map((emoji, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-accent text-lg hover-scale transition-all duration-150"
                    onClick={() => insertEmoji(emoji)}
                    type="button"
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <style>{`
        .ql-toolbar {
          border: 1px solid hsl(var(--border)) !important;
          border-bottom: none !important;
          background: hsl(var(--background)) !important;
          border-radius: 8px 8px 0 0 !important;
          padding: 8px !important;
        }
        
        .ql-container {
          border: 1px solid hsl(var(--border)) !important;
          border-top: none !important;
          background: hsl(var(--background)) !important;
          border-radius: 0 0 8px 8px !important;
          font-family: inherit !important;
        }
        
        .ql-editor {
          color: hsl(var(--foreground)) !important;
          font-family: inherit !important;
          min-height: 150px !important;
          padding: 12px 15px !important;
        }
        
        .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground)) !important;
          font-style: normal !important;
        }
        
        .ql-snow .ql-picker-options {
          background: hsl(var(--background)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 6px !important;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
        }
        
        .ql-snow .ql-tooltip {
          background: hsl(var(--background)) !important;
          border: 1px solid hsl(var(--border)) !important;
          color: hsl(var(--foreground)) !important;
          border-radius: 6px !important;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
        }
        
        .ql-snow .ql-tooltip input[type=text] {
          background: hsl(var(--background)) !important;
          color: hsl(var(--foreground)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 4px !important;
        }
        
        .ql-snow .ql-stroke {
          stroke: hsl(var(--foreground)) !important;
        }
        
        .ql-snow .ql-fill {
          fill: hsl(var(--foreground)) !important;
        }
        
        .ql-snow .ql-picker {
          color: hsl(var(--foreground)) !important;
        }
        
        .ql-toolbar button:hover,
        .ql-toolbar button:focus,
        .ql-toolbar button.ql-active {
          background: hsl(var(--accent)) !important;
          border-radius: 4px !important;
        }
        
        .ql-snow a {
          color: hsl(var(--primary)) !important;
        }
      `}</style>
    </div>
  );
}