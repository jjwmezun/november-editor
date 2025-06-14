# November Editor

A GUI editor for various data for _Boskeopolis Land_.

Created by J. J. W. Mezun. Released under GPLv3 license.

## Todo:

☐ Sprites layer.
☐ Background layer.
☐ Object selector.
☐ Multiple tilesets

## File format

per level:
* level header: 2+ bytes
  * name: 1+ bytes
  * goal: 1+ bytes
    * type: 1 byte
    * misc options: 0+ bytes
* per map:
  * map options:
    * width: 2 bytes
    * height: 2 bytes
    * layer count: 1 byte
  * per layer:
    * layer options:
      * scrollX: 4 bytes
    * per object:
      * object: 2+ bytes
        * type: 2 bytes
        * misc object options: 0+ bytes
    * layer terminator: 2 bytes
