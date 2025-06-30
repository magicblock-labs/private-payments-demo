import './Active.scss'; // Assuming you'll create a corresponding SCSS file

import { motion } from 'framer-motion';
import React from 'react';

type ActiveProps = {
  clsName: string; // Expected to be "on" or "off"
};

const Active: React.FC<ActiveProps> = ({ clsName }) => {
  return (
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`active ${clsName}`}>
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className={`circle ${clsName}`} />
    </motion.div>
  );
};

export default Active;
