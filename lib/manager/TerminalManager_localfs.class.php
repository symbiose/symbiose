<?php
namespace lib\manager;

use \lib\entities\Terminal;
use \lib\entities\Cmd;

/**
 * Manage terminals.
 * @author $imon
 */
class TerminalManager_localfs extends TerminalManager {
	/**
	 * Executables' directories.
	 * @var array
	 */
	protected $executablesDirs = array('/bin','/usr/bin');
	/**
	 * Executables' extensions.
	 * @var array
	 */
	protected $executablesExtensions = array('js', 'php');

	public function buildCmd($rawCmd, $terminalId) {
		return new Cmd(array('cmd' => $rawCmd));
	}

	public function findExecutable(Cmd $cmd, Terminal $terminal) {
		$dao = $this->dao;

		$executablePath = null;

		if (preg_match('#^[\.~]?/#', $cmd['executable'])) {
			$path = $terminal->absoluteLocation($cmd['executable']);
			if ($dao->exists($path) && !$dao->isDir($path) && in_array($dao->extension($path), $this->executablesExtensions)) {
				$executablePath = $path;
			}
		}

		foreach ($this->executablesDirs as $dir) {
			$path = $dir . '/' . $cmd['executable'];
			if ($dao->exists($path) && !$dao->isDir($path) && in_array($dao->extension($path), $this->executablesExtensions)) {
				$executablePath = $path;
				break;
			}

			foreach($this->executablesExtensions as $ext) {
				$path = $dir . '/' . $cmd['executable'] . '.' . $ext;
				if ($dao->exists($path) && !$dao->isDir($path) && in_array($dao->extension($path), $this->executablesExtensions)) {
					$executablePath = $path;
					break;
				}
			}
		}

		if (empty($executablePath)) {
			throw new \RuntimeException('"'.$cmd['cmd'].'" : unknown command');
		}
		
		return $executablePath;
	}
}