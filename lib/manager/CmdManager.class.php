<?php
namespace lib\manager;

use \lib\entities\Terminal;
use \lib\entities\Cmd;

/**
 * Manage commands.
 * @author Simon Ser
 * @since 1.0beta4
 */
abstract class CmdManager extends \lib\Manager {
	/**
	 * Executables' directories.
	 * @var array
	 */
	protected $executablesDirs = array('/usr/bin');
	/**
	 * Executables' extensions.
	 * @var array
	 */
	protected $executablesExtensions = array('js', 'php');

	/**
	 * Find an executable path.
	 * @param  Cmd      $cmd      The command.
	 * @param  Terminal $terminal The terminal.
	 * @return string             The executable path.
	 */
	abstract public function findExecutable(Cmd $cmd, Terminal $terminal);
}