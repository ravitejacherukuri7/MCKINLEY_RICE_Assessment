import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

const VirtualizedEditor = ({ documentNodes, nodeHeight = 30, windowBuffer = 5 }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const [editorDimensions, setEditorDimensions] = useState({ height: 600, width: 800 });

  const containerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const nodeRefs = useRef(new Map());
  const renderCache = useRef(new Map());

  const totalHeight = useMemo(() => {
    return documentNodes.length * nodeHeight;
  }, [documentNodes.length, nodeHeight]);

  const calculateVisibleRange = useCallback((scrollPosition, containerHeight) => {
    const start = Math.max(0, Math.floor(scrollPosition / nodeHeight) - windowBuffer);
    const end = Math.min(
      documentNodes.length,
      Math.ceil((scrollPosition + containerHeight) / nodeHeight) + windowBuffer
    );
    return { start, end };
  }, [nodeHeight, windowBuffer, documentNodes.length]);

  const handleScroll = useCallback((e) => {
    const newScrollTop = e.target.scrollTop;
    setScrollTop(newScrollTop);
    
    const newRange = calculateVisibleRange(newScrollTop, editorDimensions.height);
    setVisibleRange(newRange);
  }, [calculateVisibleRange, editorDimensions.height]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientHeight, clientWidth } = containerRef.current;
        setEditorDimensions({ height: clientHeight, width: clientWidth });
        
        const newRange = calculateVisibleRange(scrollTop, clientHeight);
        setVisibleRange(newRange);
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [scrollTop, calculateVisibleRange]);
  
  const renderNode = useCallback((node, index) => {
    const cacheKey = `${node.id}-${node.content?.substring(0, 50)}`;

    if (renderCache.current.has(cacheKey)) {
      return React.cloneElement(renderCache.current.get(cacheKey), {
        ref: (el) => nodeRefs.current.set(index, el),
        style: { height: nodeHeight, position: 'absolute', top: index * nodeHeight }
      });
    }
    
    let element;

    switch (node.type) {
      case 'formula':
        element = (
          <div 
            className="formula-node"
            data-node-id={node.id}
            data-index={index}
            style={{
              height: nodeHeight,
              display: 'flex',
              alignItems: 'center',
              padding: '0 10px',
              backgroundColor: '#f5f5f5',
              borderBottom: '1px solid #e0e0e0',
              fontFamily: '"Cambria Math", serif',
              position: 'absolute',
              top: index * nodeHeight,
              width: '100%'
            }}
          >
            <span>Formula: {node.content}</span>
          </div>
        );
        break;
        
      case 'heading':
        element = (
          <div 
            className="heading-node"
            data-node-id={node.id}
            data-index={index}
            style={{
              height: nodeHeight,
              display: 'flex',
              alignItems: 'center',
              padding: '0 10px',
              fontWeight: 'bold',
              fontSize: `${node.level === 1 ? '24px' : node.level === 2 ? '20px' : '18px'}`,
              borderBottom: '2px solid #333',
              position: 'absolute',
              top: index * nodeHeight,
              width: '100%'
            }}
          >
            {node.content}
          </div>
        );
        break;
        
      default: 
        element = (
          <div 
            className="text-node"
            data-node-id={node.id}
            data-index={index}
            style={{
              height: nodeHeight,
              display: 'flex',
              alignItems: 'center',
              padding: '0 10px',
              borderBottom: '1px solid #eee',
              position: 'absolute',
              top: index * nodeHeight,
              width: '100%'
            }}
          >
            <span>{node.content}</span>
          </div>
        );
    }
    
    renderCache.current.set(cacheKey, element);

    return React.cloneElement(element, {
      ref: (el) => nodeRefs.current.set(index, el)
    });
  }, [nodeHeight]);
 
  const visibleNodes = useMemo(() => {
    const nodes = [];
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      const node = documentNodes[i];
      if (node) {
        nodes.push({
          ...node,
          index: i,
          topPosition: i * nodeHeight
        });
      }
    }
    return nodes;
  }, [documentNodes, visibleRange, nodeHeight]);

  const handleNodeUpdate = useCallback((index, newContent) => {
    documentNodes[index].content = newContent;

    const node = documentNodes[index];
    const cacheKey = `${node.id}-${node.content?.substring(0, 50)}`;
    renderCache.current.delete(cacheKey);

    const nodeElement = nodeRefs.current.get(index);
    if (nodeElement) {
      console.log(`Updating node ${index}: ${newContent}`);
    }
  }, [documentNodes]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      const { clientHeight } = containerRef.current;
      const initialRange = calculateVisibleRange(0, clientHeight);
      setVisibleRange(initialRange);
    }
  }, [calculateVisibleRange]);
  
  return (
    <div 
      ref={containerRef}
      style={{
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{
          height: '100%',
          width: '100%',
          overflow: 'auto',
          position: 'relative'
        }}
      >
        
        <div 
          style={{
            height: totalHeight,
            position: 'relative',
            width: '100%'
          }}
        >
          
          {visibleNodes.map((node) => (
            <React.Fragment key={`${node.id}-${node.index}`}>
              {renderNode(node, node.index)}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div 
        style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: 4,
          fontSize: '12px',
          zIndex: 1000
        }}
      >
        Showing {visibleRange.start}-{visibleRange.end} of {documentNodes.length} nodes
      </div>

      {visibleRange.end < documentNodes.length && (
        <div 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '1px',
            backgroundColor: '#007acc',
            transition: 'width 0.3s ease'
          }}
        />
      )}
    </div>
  );
};

const useDocument = (initialNodes = []) => {
  const [nodes, setNodes] = useState(initialNodes);
  const [selection, setSelection] = useState(null);
  
  const updateNode = useCallback((index, updates) => {
    setNodes(prev => {
      const newNodes = [...prev];
      newNodes[index] = { ...newNodes[index], ...updates };
      return newNodes;
    });
  }, []);
  
  const insertNode = useCallback((index, node) => {
    setNodes(prev => {
      const newNodes = [...prev];
      newNodes.splice(index, 0, node);
      return newNodes;
    });
  }, []);
  
  const deleteNode = useCallback((index) => {
    setNodes(prev => {
      const newNodes = [...prev];
      newNodes.splice(index, 1);
      return newNodes;
    });
  }, []);
  
  return {
    nodes,
    selection,
    setSelection,
    updateNode,
    insertNode,
    deleteNode
  };
};

const ExampleDocumentEditor = () => {
  const generateDocument = () => {
    const nodes = [];
    for (let i = 0; i < 15000; i++) {
      if (i % 50 === 0) {
        nodes.push({
          id: `heading-${i}`,
          type: 'heading',
          level: i % 150 === 0 ? 1 : i % 100 === 0 ? 2 : 3,
          content: `Section ${Math.floor(i / 50) + 1}`
        });
      } else if (i % 7 === 0) {
        nodes.push({
          id: `formula-${i}`,
          type: 'formula',
          content: `E = mc^${i % 10}`
        });
      } else {
        nodes.push({
          id: `text-${i}`,
          type: 'text',
          content: `This is paragraph ${i + 1} with some sample text to demonstrate the virtualized editor.`
        });
      }
    }
    return nodes;
  };
  
  const documentNodes = useMemo(() => generateDocument(), []);
  const document = useDocument(documentNodes);
  
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <VirtualizedEditor 
        documentNodes={document.nodes}
        nodeHeight={40}
        windowBuffer={8}
      />
    </div>
  );
};

const useThrottle = (callback, delay) => {
  const timeoutRef = useRef(null);
  const lastCallRef = useRef(0);
  
  return useCallback((...args) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;
    
    const execute = () => {
      lastCallRef.current = now;
      callback(...args);
    };
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (timeSinceLastCall >= delay) {
      execute();
    } else {
      timeoutRef.current = setTimeout(() => {
        execute();
      }, delay - timeSinceLastCall);
    }
  }, [callback, delay]);
};

export default ExampleDocumentEditor;
