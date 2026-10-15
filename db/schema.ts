import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const healthStates=sqliteTable('health_states',{owner:text('owner').primaryKey(),payload:text('payload').notNull(),revision:integer('revision').notNull().default(0),updatedAt:text('updated_at').notNull()});
export const healthFiles=sqliteTable('health_files',{id:text('id').primaryKey(),owner:text('owner').notNull(),name:text('name').notNull(),mime:text('mime').notNull(),size:integer('size').notNull(),createdAt:text('created_at').notNull()});
