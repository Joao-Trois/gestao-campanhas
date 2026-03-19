import fs from 'fs';
const data = JSON.parse(fs.readFileSync('C:\\Users\\TI 3\\.mcp-figma\\cache\\file_nodes_Jvo2kEyq3fkcvDX5FFEA2I_1773858923541.json'));

const frames = [];
function traverse(node) {
  if (node.type === 'FRAME' || node.type === 'SECTION') {
    frames.push({ id: node.id, name: node.name, type: node.type });
  }
  if (node.children) node.children.forEach(traverse);
}
Object.values(data.nodes).forEach(n => traverse(n.document));

console.log(frames.map(f => `${f.id} - ${f.name} (${f.type})`).join('\n'));
