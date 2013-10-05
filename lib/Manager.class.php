<?php
namespace lib;

/**
 * A data manager.
 * @author Simon Ser
 * @since 1.0beta1
 */
abstract class Manager {
	/**
	 * The DAO which will be used to access data from this manager.
	 * @var object
	 */
	protected $dao;

	/**
	 * Initialize the manager.
	 * @param object $dao The DAO which will be used to access data from this manager.
	 */
	public function __construct($dao) {
		$this->dao = $dao;
	}

	/**
	 * Get this DAO.
	 * @return object This DAO.
	 */
	protected function dao() {
		return $this->dao;
	}
}