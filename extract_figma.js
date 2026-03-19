import fs from 'fs';

try {
  const data = JSON.parse(fs.readFileSync('C:\\Users\\TI 3\\.mcp-figma\\cache\\file_nodes_Jvo2kEyq3fkcvDX5FFEA2I_1773924871404.json', 'utf8'));

  function findNodes(node, name) {
    if (node.name && node.name.toLowerCase().includes(name)) {
      if (node.type === 'FRAME' || node.type === 'COMPONENT') {
        console.log('FOUND:', node.name, node.id, node.type);
      }
    }
    if (node.children) {
      node.children.forEach(n => findNodes(n, name));
    }
  }

  for (const id in data.nodes) {
    const doc = data.nodes[id].document;
    findNodes(doc, 'lista');
    findNodes(doc, 'upload');
    findNodes(doc, 'contato');
  }
} catch (e) {
  console.error(e);
}
