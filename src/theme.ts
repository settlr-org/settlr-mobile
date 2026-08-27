import { Platform } from 'react-native';
export const colors = { ink:'#17211c', muted:'#68766e', cream:'#f7f8f4', paper:'#ffffff', sage:'#dceee4', teal:'#166b58', coral:'#e6674f', line:'#dfe7e1', gold:'#e2b95b' } as const;
export const type = { title: Platform.select({ios:'Avenir Next', android:'sans-serif', default:'system-ui'}), body: Platform.select({ios:'Avenir Next', android:'sans-serif', default:'system-ui'}) };
