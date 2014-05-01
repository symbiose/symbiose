<?php
namespace lib\manager;

use \lib\entities\Terminal;
use \lib\entities\Cmd;

class CmdManager_localfs extends CmdManager {
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
			throw new \RuntimeException('"'.$cmd['executable'].'": unknown command');
		}

		return $executablePath;
	}
}