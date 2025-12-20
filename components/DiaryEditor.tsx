'use client';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import React, { useEffect, useState, useRef } from 'react';
import { ImageIcon, Loader2 } from 'lucide-react';
import { uploadDiaryImage } from '@/app/actions/diary';
import { $createParagraphNode, $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, TextFormatType } from 'lexical';

import { DecoratorNode } from 'lexical';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { mergeRegister } from '@lexical/utils';
import {
  $createNodeSelection,
  $getNodeByKey,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  DRAGSTART_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  NodeKey,
} from 'lexical';

export class SimpleImageNode extends DecoratorNode<React.JSX.Element> {
  __src: string;
  __altText: string;

  static getType(): string {
    return 'simple-image';
  }

  static clone(node: SimpleImageNode): SimpleImageNode {
    return new SimpleImageNode(node.__src, node.__altText, node.__key);
  }

  constructor(src: string, altText: string, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__altText = altText;
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.justifyContent = 'center';
    return div;
  }

  updateDOM(): boolean {
    return false;
  }

  decorate(): React.JSX.Element {
    return <img src={this.__src} alt={this.__altText} className="max-w-full h-auto rounded-lg my-4" />;
  }

  exportJSON() {
      return {
          type: 'simple-image',
          src: this.__src,
          altText: this.__altText,
          version: 1,
      };
  }

  static importJSON(serializedNode: any): SimpleImageNode {
      const { src, altText } = serializedNode;
      const node = $createSimpleImageNode(src, altText);
      return node;
  }
}

export function $createSimpleImageNode(src: string, altText: string): SimpleImageNode {
  return new SimpleImageNode(src, altText);
}

export function $isSimpleImageNode(node: any): node is SimpleImageNode {
  return node instanceof SimpleImageNode;
}

// Toolbar Component
const Toolbar = ({ onInsertImage }: { onInsertImage: () => void }) => {
  const [editor] = useLexicalComposerContext();

  const format = (type: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, type);
  };

  return (
    <div className="flex items-center gap-2 border-t p-2 bg-gray-50 dark:bg-gray-900 z-10">
      <button type="button" onClick={() => format('bold')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded font-bold">B</button>
      <button type="button" onClick={() => format('italic')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded italic">I</button>
      <button type="button" onClick={() => format('underline')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded underline">U</button>
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-2"></div>
      <button type="button" onClick={onInsertImage} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded flex items-center gap-2">
         <ImageIcon className="w-4 h-4" />
         <span className="text-sm">画像</span>
      </button>
    </div>
  );
}

const theme = {
  paragraph: 'mb-4',
  quote: 'border-l-4 border-gray-500 pl-4 italic my-4',
  heading: {
    h1: 'text-3xl font-bold mb-4',
    h2: 'text-2xl font-bold mb-3',
    h3: 'text-xl font-bold mb-2',
  },
  list: {
    nested: {
      listitem: 'pl-4',
    },
    ol: 'list-decimal pl-8 mb-4',
    ul: 'list-disc pl-8 mb-4',
    listitem: 'mb-1',
  },
  link: 'text-blue-500 hover:underline cursor-pointer',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    underlineStrikethrough: 'underline line-through',
  },
};

export default function Editor({ onChange, initialContent, readOnly = false }: { onChange?: (state: any) => void, initialContent?: string, readOnly?: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const editorRef = useRef<any>(null);

  const initialConfig = {
    namespace: 'DiaryEditor',
    theme,
    onError: (e: Error) => console.error(e),
    editable: !readOnly,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
      SimpleImageNode
    ]
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await uploadDiaryImage(formData);
      if (result.url && editorRef.current) {
         editorRef.current.update(() => {
            const node = $createSimpleImageNode(result.url, file.name);
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
               selection.insertNodes([node]);
               selection.insertParagraph(); // Insert a new paragraph after the image
            } else {
               const root = $getNodeByKey('root');
            }
         });
      }
    } catch (error) {
      console.error('Failed to upload image', error);
      alert('Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`border rounded-lg overflow-hidden flex flex-col ${readOnly ? 'border-none' : 'min-h-[400px]'}`}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="relative flex-1 p-4">
          <RichTextPlugin
            contentEditable={<ContentEditable className="outline-none min-h-[300px] h-full" />}
            placeholder={!readOnly ? <div className="absolute top-4 left-4 text-gray-400 pointer-events-none">ここに日記を書く...</div> : null}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <AutoFocusPlugin />
          <ListPlugin />
          <LinkPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />

          <CaptureEditorRef editorRef={editorRef} />
          {onChange && <OnChangePlugin onChange={(editorState) => onChange(JSON.stringify(editorState))} />}

          {initialContent && <LoadInitialContent content={initialContent} />}
        </div>

        {!readOnly && (
           <>
             <Toolbar onInsertImage={() => fileInputRef.current?.click()} />
             <input
               type="file"
               ref={fileInputRef}
               className="hidden"
               accept="image/*"
               onChange={handleImageUpload}
             />
             {isUploading && (
                <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center">
                   <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
             )}
           </>
        )}
      </LexicalComposer>
    </div>
  );
}

function CaptureEditorRef({ editorRef }: { editorRef: any }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editorRef.current = editor;
  }, [editor, editorRef]);
  return null;
}

function LoadInitialContent({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (content) {
      const initialEditorState = editor.parseEditorState(content);
      editor.setEditorState(initialEditorState);
    }
  }, [content, editor]);
  return null;
}
