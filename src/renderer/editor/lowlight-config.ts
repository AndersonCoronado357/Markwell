import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import markdown from 'highlight.js/lib/languages/markdown';
import rust from 'highlight.js/lib/languages/rust';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import php from 'highlight.js/lib/languages/php';
import yaml from 'highlight.js/lib/languages/yaml';

export const lowlight = createLowlight();
lowlight.register('javascript', javascript);
lowlight.register('js', javascript);
lowlight.register('typescript', typescript);
lowlight.register('ts', typescript);
lowlight.register('html', xml);
lowlight.register('xml', xml);
lowlight.register('css', css);
lowlight.register('json', json);
lowlight.register('python', python);
lowlight.register('py', python);
lowlight.register('bash', bash);
lowlight.register('sh', bash);
lowlight.register('sql', sql);
lowlight.register('markdown', markdown);
lowlight.register('md', markdown);
lowlight.register('rust', rust);
lowlight.register('rs', rust);
lowlight.register('go', go);
lowlight.register('java', java);
lowlight.register('c', c);
lowlight.register('cpp', cpp);
lowlight.register('csharp', csharp);
lowlight.register('cs', csharp);
lowlight.register('php', php);
lowlight.register('yaml', yaml);
lowlight.register('yml', yaml);

/** Lista de lenguajes ofrecidos en el selector del bloque de código. */
export const LANGUAGES: { label: string; value: string }[] = [
  { label: 'Texto plano', value: 'plaintext' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'JSON', value: 'json' },
  { label: 'Python', value: 'python' },
  { label: 'Bash / Shell', value: 'bash' },
  { label: 'SQL', value: 'sql' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'Rust', value: 'rust' },
  { label: 'Go', value: 'go' },
  { label: 'Java', value: 'java' },
  { label: 'C', value: 'c' },
  { label: 'C++', value: 'cpp' },
  { label: 'C#', value: 'csharp' },
  { label: 'PHP', value: 'php' },
  { label: 'YAML', value: 'yaml' },
];
