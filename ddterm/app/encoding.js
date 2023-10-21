/*
    Copyright © 2023 Aleksandr Mezin

    This file is part of ddterm GNOME Shell extension.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

if (!globalThis.TextEncoder) {
    globalThis.TextEncoder = class {
        encode(str) {
            return imports.byteArray.fromString(str);
        }
    };
}

if (!globalThis.TextDecoder) {
    globalThis.TextDecoder = class {
        decode(bytes) {
            return imports.byteArray.toString(bytes);
        }
    };
}