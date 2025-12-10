import React, { useState, useRef, useEffect } from 'react';

const FormulaComponent = ({ content, onUpdate, onDelete, isFocused }) => {
  const [value, setValue] = useState(content || 'E = mc^2');
  
  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (onUpdate) onUpdate(newValue);
  };
  
  return (
    <div 
      className={`formula-component ${isFocused ? 'focused' : ''}`}
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        margin: '0 4px',
        backgroundColor: isFocused ? '#e3f2fd' : '#f5f5f5',
        border: `2px solid ${isFocused ? '#2196f3' : '#ddd'}`,
        borderRadius: '4px',
        minWidth: '100px',
      }}
    >
      <span style={{ marginRight: '8px' }}>𝑓(𝑥) =</span>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        style={{
          border: 'none',
          background: 'transparent',
          outline: 'none',
          width: '80px',
          borderBottom: '1px dashed #666',
        }}
      />
      <button 
        onClick={onDelete}
        style={{
          marginLeft: '8px',
          background: '#ffebee',
          border: '1px solid #ef5350',
          borderRadius: '3px',
          color: '#d32f2f',
          cursor: 'pointer',
          fontSize: '12px',
        }}
      >
        ×
      </button>
    </div>
  );
};

const useVirtualModelEditor = () => {
  const [model, setModel] = useState([
    { type: 'text', id: '1', content: 'This is a text block with a ' },
    { type: 'formula', id: '2', content: 'E = mc^2' },
    { type: 'text', id: '3', content: ' formula embedded in it.' }
  ]);
  
  const [cursorPosition, setCursorPosition] = useState({ blockIndex: 0, offset: 0 });
  const [selection, setSelection] = useState(null);
  
  const insertFormula = (position) => {
    const newFormula = {
      type: 'formula',
      id: `formula-${Date.now()}`,
      content: 'f(x) = ?'
    };
    
    const newModel = [...model];
    
    if (position.blockIndex >= 0 && newModel[position.blockIndex].type === 'text') {
      const block = newModel[position.blockIndex];
      const beforeText = block.content.substring(0, position.offset);
      const afterText = block.content.substring(position.offset);
    
      const newBlocks = [];
      
      if (beforeText) {
        newBlocks.push({ 
          type: 'text', 
          id: `${block.id}-before`, 
          content: beforeText 
        });
      }
      
      newBlocks.push(newFormula);
      
      if (afterText) {
        newBlocks.push({ 
          type: 'text', 
          id: `${block.id}-after`, 
          content: afterText 
        });
      }
      
      newModel.splice(position.blockIndex, 1, ...newBlocks);
    } else {
      newModel.splice(position.blockIndex + 1, 0, newFormula);
    }
    
    setModel(newModel);
    const formulaIndex = newModel.findIndex(item => item.id === newFormula.id);
    setCursorPosition({ blockIndex: formulaIndex + 1, offset: 0 });
  };
  
  const updateBlock = (id, newContent) => {
    setModel(prev => prev.map(block => 
      block.id === id ? { ...block, content: newContent } : block
    ));
  };
  
  const deleteBlock = (id) => {
    setModel(prev => {
      const index = prev.findIndex(block => block.id === id);
      if (index === -1) return prev;
      
      const newModel = [...prev];
      newModel.splice(index, 1);
      
      if (index > 0 && index < newModel.length && 
          newModel[index - 1].type === 'text' && 
          newModel[index]?.type === 'text') {
        const mergedBlock = {
          type: 'text',
          id: `${newModel[index - 1].id}-merged`,
          content: newModel[index - 1].content + newModel[index].content
        };
        newModel.splice(index - 1, 2, mergedBlock);
      }
      
      return newModel;
    });
  };
  
  const handleVirtualCursorClick = (blockIndex, offset) => {
    setCursorPosition({ blockIndex, offset });
    setSelection(null);
  };
  
  const handleVirtualSelect = (start, end) => {
    setSelection({ start, end });
  };
  
  return {
    model,
    cursorPosition,
    selection,
    insertFormula,
    updateBlock,
    deleteBlock,
    handleVirtualCursorClick,
    handleVirtualSelect,
    setCursorPosition
  };
};

const RichTextEditorComparison = () => {
  const [activeTab, setActiveTab] = useState('contentEditable');
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [insertPosition, setInsertPosition] = useState(null);

  const contentEditableRef = useRef(null);
 
  const virtualEditor = useVirtualModelEditor();
  
  const handleContentEditableKeyDown = (e) => {
    if (e.key === 'F2' || (e.ctrlKey && e.key === 'm')) {
      e.preventDefault();
      insertFormulaAtCursor();
    }
  };
  
  const getContentEditableCursorPosition = () => {
    if (!contentEditableRef.current) return null;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;
    
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(contentEditableRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    const position = {
      range,
      offset: preCaretRange.toString().length,
      rect: range.getBoundingClientRect(),
      node: range.endContainer,
      nodeOffset: range.endOffset
    };
    
    return position;
  };
  
  const insertFormulaAtCursor = () => {
    const cursorPos = getContentEditableCursorPosition();
    if (!cursorPos) return;
    
    const { range } = cursorPos;
 
    const formulaId = `formula-${Date.now()}`;
    const formulaSpan = document.createElement('span');
    formulaSpan.className = 'formula-placeholder';
    formulaSpan.contentEditable = 'false';
    formulaSpan.setAttribute('data-formula-id', formulaId);
    formulaSpan.style.display = 'inline-block';
    formulaSpan.style.backgroundColor = '#e3f2fd';
    formulaSpan.style.padding = '2px 8px';
    formulaSpan.style.margin = '0 4px';
    formulaSpan.style.borderRadius = '4px';
    formulaSpan.style.border = '2px solid #2196f3';
    formulaSpan.textContent = '𝑓(𝑥) = ?';
   
    range.deleteContents();
    range.insertNode(formulaSpan);
    
    const space = document.createTextNode(' ');
    range.insertNode(space);

    const newRange = document.createRange();
    newRange.setStartAfter(space);
    newRange.collapse(true);
    
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(newRange);
    
    contentEditableRef.current.focus();
  };
  
  const handleFormulaClickInContentEditable = (e) => {
    if (e.target.classList.contains('formula-placeholder')) {
      e.preventDefault();
      const formulaId = e.target.getAttribute('data-formula-id');
      const newFormula = prompt('Edit formula:', e.target.textContent);
      if (newFormula !== null) {
        e.target.textContent = newFormula;
      }
    }
  };
  
  const insertFormulaInVirtualModel = () => {
    virtualEditor.insertFormula(virtualEditor.cursorPosition);
  };

  const renderVirtualBlock = (block, index) => {
    const isCursorBlock = index === virtualEditor.cursorPosition.blockIndex;
    
    if (block.type === 'text') {
      return (
        <span
          key={block.id}
          className={`virtual-text-block ${isCursorBlock ? 'cursor-block' : ''}`}
          onClick={(e) => {
            const textNode = e.currentTarget;
            const range = document.createRange();
            range.selectNodeContents(textNode);
     
            const clickX = e.clientX;
            const rects = range.getClientRects();
            
            let closestOffset = 0;
            let minDistance = Infinity;
         
            for (let i = 0; i <= block.content.length; i++) {
              const charRange = document.createRange();
              if (i === 0) {
                charRange.setStart(textNode.firstChild || textNode, 0);
                charRange.collapse(true);
              } else if (i === block.content.length) {
                charRange.setStart(textNode.firstChild || textNode, block.content.length);
                charRange.collapse(true);
              } else {
                charRange.setStart(textNode.firstChild || textNode, i);
                charRange.collapse(true);
              }
              
              const rect = charRange.getBoundingClientRect();
              const distance = Math.abs(rect.left - clickX);
              
              if (distance < minDistance) {
                minDistance = distance;
                closestOffset = i;
              }
            }
            
            virtualEditor.handleVirtualCursorClick(index, closestOffset);
          }}
          style={{
            position: 'relative',
            padding: '2px 0',
            backgroundColor: isCursorBlock ? '#f0f0f0' : 'transparent',
          }}
        >
          {block.content}
          {isCursorBlock && (
            <span
              style={{
                position: 'absolute',
                left: `${Math.min(virtualEditor.cursorPosition.offset, block.content.length) * 8}px`,
                top: 0,
                height: '100%',
                width: '2px',
                backgroundColor: '#2196f3',
                pointerEvents: 'none',
              }}
            />
          )}
        </span>
      );
    } else if (block.type === 'formula') {
      return (
        <FormulaComponent
          key={block.id}
          content={block.content}
          onUpdate={(newContent) => virtualEditor.updateBlock(block.id, newContent)}
          onDelete={() => virtualEditor.deleteBlock(block.id)}
          isFocused={isCursorBlock}
        />
      );
    }
    
    return null;
  };
   
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <h1>Rich Text Editor: contentEditable vs Virtual Model</h1>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setActiveTab('contentEditable')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'contentEditable' ? '#2196f3' : '#f5f5f5',
            color: activeTab === 'contentEditable' ? 'white' : '#333',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          contentEditable Approach
        </button>
        <button
          onClick={() => setActiveTab('virtualModel')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'virtualModel' ? '#2196f3' : '#f5f5f5',
            color: activeTab === 'virtualModel' ? 'white' : '#333',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Virtual Model Approach
        </button>
      </div>
      
      <div style={{ 
        backgroundColor: '#fafafa', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid #eee',
        marginBottom: '30px'
      }}>
        <h3>Technical Differences</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h4>contentEditable="true"</h4>
            <ul>
              <li><strong>Browser-native</strong> content editing</li>
              <li><strong>DOM-based</strong> - direct manipulation of HTML</li>
              <li><strong>Selection/Range API</strong> for cursor positioning</li>
              <li><strong>Complex</strong> to handle custom blocks consistently</li>
              <li><strong>Cross-browser</strong> inconsistencies</li>
              <li><strong>Easier</strong> to implement initially</li>
            </ul>
          </div>
          <div>
            <h4>Virtual Model Engine</h4>
            <ul>
              <li><strong>Custom rendering</strong> based on data model</li>
              <li><strong>Predictable</strong> state management</li>
              <li><strong>Full control</strong> over cursor/selection logic</li>
              <li><strong>Complex</strong> cursor position calculation</li>
              <li><strong>Better</strong> for custom block types</li>
              <li><strong>More code</strong> required initially</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => {
            if (activeTab === 'contentEditable') {
              insertFormulaAtCursor();
            } else {
              insertFormulaInVirtualModel();
            }
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            marginRight: '10px',
          }}
        >
          Insert Formula at Cursor
        </button>
        <span style={{ color: '#666', fontSize: '14px' }}>
          {activeTab === 'contentEditable' 
            ? 'Shortcut: F2 or Ctrl+M' 
            : 'Click on text to position cursor, then insert'}
        </span>
      </div>
      
      <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ 
          padding: '10px 15px', 
          backgroundColor: '#f5f5f5', 
          borderBottom: '1px solid #ddd',
          fontWeight: 'bold'
        }}>
          Editor ({activeTab === 'contentEditable' ? 'contentEditable' : 'Virtual Model'})
        </div>
        
        {activeTab === 'contentEditable' ? (
          <div
            ref={contentEditableRef}
            contentEditable="true"
            onKeyDown={handleContentEditableKeyDown}
            onClick={handleFormulaClickInContentEditable}
            style={{
              minHeight: '200px',
              padding: '20px',
              outline: 'none',
              fontSize: '16px',
              lineHeight: '1.6',
            }}
            dangerouslySetInnerHTML={{
              __html: 'This is a contentEditable area. Click here and type. Use F2 or Ctrl+M to insert a formula block.'
            }}
          />
        ) : (
          <div
            style={{
              minHeight: '200px',
              padding: '20px',
              fontSize: '16px',
              lineHeight: '1.6',
              cursor: 'text',
              backgroundColor: 'white',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                virtualEditor.setCursorPosition({ 
                  blockIndex: virtualEditor.model.length, 
                  offset: 0 
                });
              }
            }}
          >
            {virtualEditor.model.length === 0 ? (
              <div style={{ color: '#999' }}>
                Click here to start typing. This is a virtual model editor.
              </div>
            ) : (
              virtualEditor.model.map((block, index) => renderVirtualBlock(block, index))
            )}
            
            {virtualEditor.model.length > 0 && virtualEditor.cursorPosition.blockIndex === virtualEditor.model.length && (
              <span
                style={{
                  display: 'inline-block',
                  width: '2px',
                  height: '1.2em',
                  backgroundColor: '#2196f3',
                  verticalAlign: 'middle',
                  marginLeft: '2px',
                }}
              />
            )}
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
        <h4>Cursor/Selection Details:</h4>
        {activeTab === 'contentEditable' ? (
          <div>
            <p>Using browser's native <code>window.getSelection()</code> and <code>Range</code> API</p>
            <p>Formula blocks are <code>contentEditable="false"</code> spans</p>
            <p>Position calculated via <code>range.cloneRange()</code> and <code>range.toString().length</code></p>
          </div>
        ) : (
          <div>
            <p>Cursor: Block {virtualEditor.cursorPosition.blockIndex}, Offset {virtualEditor.cursorPosition.offset}</p>
            <p>Total blocks: {virtualEditor.model.length}</p>
            <p>Custom cursor positioning via click coordinate calculation</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RichTextEditorComparison;
