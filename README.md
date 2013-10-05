[Symbiose 1.0 beta 3](http://symbiose.fr.cr/)
==============================================

This version (beta) is unstable.  

Quick start
-----------

You can try Symbiose on our website : http://symbiose.fr.cr/ (username : _demo_, password : _demo_).

Clone the repo, `git clone git://github.com/symbiose/symbiose.git`, or [download the latest release](https://github.com/symbiose/symbiose/zipball/master).

You can explore the [wiki](https://github.com/symbiose/symbiose/wiki/) too.

Bug tracker
-----------

Have a bug ? Please create an issue here on GitHub : https://github.com/symbiose/symbiose/issues.

Installing
----------

To install Symbiose you just need to unzip files on your web server and chmod all of them to 0777. If a HTTP 500 error occurs, chmod */.htaccess*, */sbin/* and */index.php* to 0755.

For more information, please see the wiki : https://github.com/symbiose/symbiose/wiki/Installing.

Upgrading from 1.0 beta 2
-------------------------

If you are using Symbiose 1.0 beta 2 or a commit which is [`9e1d0cd`](https://github.com/symbiose/symbiose/commit/9e1d0cd503acca9fd91df14652771887659a2635) or older, you must do a specific operation for migrating to 1.0 beta 3 (newer than `9e1d0cd`).

* Login as administrator and open a terminal
* Run `migrate-to-beta3`
* Save files stored in the newly created folder `webos-export`
* Upgrade the webos to the newest version
* Copy files from `webos-export` to `/` (the webos root)
* Clear sessions (e.g. by deleting cookies) and refresh the page

You have to do that because users are now stored in more organized JSON files and configuration files have been modified.

Software requirements
---------------------

* Server : 
 * PHP >= 5.3
 * Database : optional (off by default)
* Client : a fast and modern web browser (e.g. the latest *Mozilla Firefox*)

Authors
-------

**$imon**
+ http://emersion.fr/
+ http://github.com/simonser

**Codel**
+ https://github.com/Codel

**Doppelganger**
+ https://github.com/Doppelganger-Symbiose

Copyright
---------

Contact: symbiose@emersion.fr  
Copyright (C) 2013 Simon Ser

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program. If not, see <http://www.gnu.org/licenses/>.
    
    THIS SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THIS SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THIS SOFTWARE.
    
    ******
    
    Ce programme est un logiciel libre : vous pouvez le redistribuer ou
    le modifier selon les termes de la GNU General Public Licence tels
    que publiés par la Free Software Foundation : à votre choix, soit la
    version 3 de la licence, soit une version ultérieure quelle qu'elle
    soit.

    Ce programme est distribué dans l'espoir qu'il sera utile, mais SANS
    AUCUNE GARANTIE ; sans même la garantie implicite de QUALITÉ
    MARCHANDE ou D'ADÉQUATION À UNE UTILISATION PARTICULIÈRE. Pour
    plus de détails, reportez-vous à la GNU General Public License.

    Vous devez avoir reçu une copie de la GNU General Public License
    avec ce programme. Si ce n'est pas le cas, consultez
    <http://www.gnu.org/licenses/>.
