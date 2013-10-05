<?php
namespace lib\manager;

class ConfigManager_localfs extends FileManager {
	public function open($path) {
		$fileContents = null;

		$internalPath = $this->dao->toInternalPath($path);
		switch ($this->dao->pathinfo($path, PATHINFO_EXTENSION)) {
			case 'json':
				return new \lib\JsonConfig($internalPath);
			case 'xml':
				return new \lib\XmlConfig($internalPath);
			default:
				throw new \RuntimeException('Cannot open configuration file "'.$path.'" : not a JSON or XML file');
		}
	}
}