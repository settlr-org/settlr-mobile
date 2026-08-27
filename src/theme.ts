import { Platform } from 'react-native';
export const colors = { ink:'#f3f4f1', muted:'#9aa19d', cream:'#090a09', paper:'#171817', sage:'#0d332a', teal:'#09bd8b', coral:'#ff6d70', line:'#292b2a', gold:'#e2b95b' } as const;
export const type = { title: Platform.select({ios:'Avenir Next', android:'sans-serif', default:'system-ui'}), body: Platform.select({ios:'Avenir Next', android:'sans-serif', default:'system-ui'}) };
