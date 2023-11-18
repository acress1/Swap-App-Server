exports.up = function (knex) {
    return knex.schema
    .createTable('Swaps', function (table) {
      table.increments('Swap_id').primary();
      table.date('Date');
      table.string('Outbound');
      table.string('Inbound');
      table.boolean('FIRST');
      table.boolean('BAR');
      table.boolean('Early');
      table.boolean('Late');
      table.boolean('LTA');
    });
  };
  
  exports.down = function (knex) {
    return knex.schema.dropTable('Swaps');
  };