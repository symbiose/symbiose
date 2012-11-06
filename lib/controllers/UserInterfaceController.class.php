<?php
namespace lib\controllers;

use \lib\models\UserInterface;

/**
 * UserInterfaceController permet de controller les interfaces utilisateur.
 * @author $imon
 * @version 1.1
 * @since 1.0 - 25 nov. 2011
 */
class UserInterfaceController extends \lib\ServerCallComponent {
	/**
	 * Recuperer la structure HTML et le script JavaScript d'une interface utilisateur.
	 * @param string $uiName Le nom de l'interface utilisateur. Si il vaut faux, l'interface par defaut sera retournee.
	 */
	protected function loadBooter($uiName = false) {
		$ui = new UserInterface($this->webos, $uiName);

		return array(
			'name' => $ui->getName(),
			'booter' => array(
				'html' => $ui->getHtml(),
				'js' => $ui->getJavascript(),
				'css' => $ui->getCss()
			)
		);
	}

	/**
	 * Recuperer la liste des interfaces utilisateur disponibles.
	 */
	protected function getList() {
		$list = $this->webos->managers()->get('UserInterface')->getList();
		foreach($list as $index => $data) {
			try {
				$ui = new UserInterface($this->webos, $data['name']);
			} catch (Exception $e) {
				continue;
			}
			$data['attributes'] = $ui->getAttributes();
			$list[$index] = $data;
		}
		return $list;
	}

	/**
	 * Recuperer la liste des interfaces installees.
	 */
	protected function getInstalled() {
		$files = $this->webos->managers()->get('File')->get('/boot/uis/')->contents();
		
		$list = array();
		foreach ($files as $file) {
			try {
				$ui = new UserInterface($this->webos, $file->basename());
			} catch (Exception $e) {
				continue;
			}
			$list[$ui->getName()] = $ui->getAttributes();
		}
		
		return $list;
	}

	/**
	 * Marquer une interface comme interface par defaut.
	 * @param string $name Le nom de l'interface.
	 * @param int $value Vrai si l'interface doit etre definie par defaut.
	 */
	protected function setDefault($name, $value) {
		$this->webos->managers()->get('UserInterface')->setDefault($name, $value);
	}

	/**
	 * Activer ou desactiver une interface.
	 * @param string $name Le nom de l'interface.
	 * @param int $value Vrai si l'interface doit etre activee.
	 */
	protected function setEnabled($name, $value) {
		if ((int) $value) {
			$this->webos->managers()->get('UserInterface')->add($name);
		} else {
			$this->webos->managers()->get('UserInterface')->remove($name);
		}
	}

	/**
	 * Modifier la configuration d'une interface.
	 * @param string $name Le nom de l'interface.
	 * @param array $data Un tableau contenant la configuration a changer.
	 */
	protected function changeConfig($name, $data) {
		foreach ($data as $index => $value) {
			switch ($index) {
				case 'default':
					$this->setDefault($name, $value);
					break;
				case 'types':
					$this->webos->managers()->get('UserInterface')->setTypes($name, $value);
					break;
				case 'enabled':
					$this->setEnabled($name, $value);
					break;
			}
		}
	}
}