import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { useSelector } from 'react-redux';

function DeleteModal(props) {
  const lang = useSelector((state) => state.lang.lang);

  let deleteModalTxt ={
    EN: {
      sure:'Are you sure?',
      pressDelete: "Press Delete button to Delete Image",
      delete:'Delete',
      
      
    },

    GE: {
      sure:'დარწუმებული ხარ?',
      pressDelete: "წასაშლელად დააწექი ღილაკს",
      delete:'წაშლა',
   
    },
  
  }
  return (
    <div>

    <Modal
      {...props}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
      >
      <Modal.Header >

        <Modal.Title id="contained-modal-title-vcenter">
         {deleteModalTxt[lang].sure}
        </Modal.Title>
      <Button onClick={props.onClose} variant="close"></Button>
      </Modal.Header>
      <Modal.Body>
        <h4>{deleteModalTxt[lang].pressDelete}</h4>
        
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={props.onDelete} variant="warning">{deleteModalTxt[lang].delete}</Button>
      </Modal.Footer>
    </Modal>
        </div>
  );
}

export default DeleteModal;

