import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { TaskService } from '../services/task.service';
import { Task } from '../models/task.model';
import { CourseService } from '../services/course.service';
import { Course } from '../models/course.model';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { S2Service } from '../services/s2.service';
import { DatePipe } from '@angular/common';


@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.css']
})
export class TasksComponent implements OnInit {
  tasks: Task[] = [];

  selectedTask: Task | null = null;
  datePipe: DatePipe = new DatePipe('en-US')  ; // Adjust the locale according to your requirements

  editMode = false;
  task: Task = {
    name: '',
    date: '' ,
    course:null,

    file: null,
    id: 0,
    etudiants: [],
    solutionTasks:[]
  };
  fileInput: ElementRef<any> | undefined;
  selectedCourseName: string='';
  courses: Course[] = [];
  selectedFile!: File ;
  taskId!:number;

  constructor(private taskService: TaskService,
     private courseService: CourseService,private http: HttpClient,private authservice:S2Service) {}

  ngOnInit() {
    this.loadTasks();
    /*this.fetchCourses();*/
    this.getCoursesByTeacherId();
  }
  getCoursesByTeacherId(): void {
    const teacherId =Number(this.authservice.getUserId());
     // Replace with the actual teacher ID
     console.log(teacherId);
    const apiUrl = `http://localhost:8080/api/tasks/${teacherId}/teacher`; // Replace with your API endpoint

    this.http.get<Course[]>(apiUrl).subscribe(
      (response:any) => {
        this.courses = response ;
        /*for (let index = 0; index < response.length; index++) {
          this.courses[index].name=response[index].coursNom;
         
          
        }*/
        console.log(this.courses);
        console.log(response);
      },
      (error) => {
        console.error('Error fetching courses:', error);
      }
    );
  }
  formatDate(date: string | null): string {
    if (date === null) {
      return ''; // or return a default value like 'N/A' or 'No Date'
    } else {
      return this.datePipe.transform(date, 'dd/MM/yyyy') || ''; // handle null or invalid date formats
    }
  }
  
  

  fetchCourses() {
    this.courseService.getCourses().subscribe(
      (courses) => {
        this.courses = courses;
        console.log('Fetched courses:', this.courses); // Add this line
        console.log('Courses:', courses);
      },
      (error) => {
        console.error('Error fetching courses:', error);
      }
    );
  }


  onCourseSelected(courseId: number | null): void {
    if (courseId === null) {
      this.task.course = null;
    } else {
      this.task.course = {
        id: courseId,
        coursNom: '',
        coursCoef:0, // Assign null initially
        idEnseignant: 0, // Assign null initially
        enseigantNom: '',
        anneeNom: '',
        tasks: []
      };
    }
  }



  loadTasks() {
    this.taskService.getTasks().subscribe(
      (tasks) => {
        this.tasks = tasks;
        console.log('Loaded tasks:', this.tasks); // Add this line
      },
      (error) => {
        console.error('Error loading tasks:', error);
      }
    );
  }

  createTask(): void {
    const formData = new FormData();
    if (this.task.file) {
      console.log('Selected File:', this.task.file);
      formData.append('file', this.task.file, this.task.file.name);
    }
    formData.append('name', this.task.name);
    formData.append('date',  new Date(this.task.date).toLocaleDateString());
    formData.append('coursename', this.selectedCourseName);
    console.log('Selected Course Name:', this.selectedCourseName);

    this.http.post<any>('http://localhost:8080/api/tasks/task', formData).subscribe(
      (newTask) => {
        console.log('Task created:', newTask);
        // Reset the form or perform other actions
      },
      (error) => {
        console.error('Error creating task:', error);
        console.log('Selected Course Name:', this.selectedCourseName);
        console.log('Selected File:', this.task.file);


      }
    );
  }

  resetForm() {
    this.task = {
      name: '',
      date: '',
      course:null,
      file: null,
      id: 0,

      etudiants: [],
      solutionTasks:[]
    };
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }



  cancelEdit() {
    // Reset the form or perform any other necessary actions
    this.resetForm();
  }

  onFileSelected(fileInput: any): void {
    if (fileInput.files.length > 0) {
      this.task.file = fileInput.files[0];
      console.log('Selected File:', this.task.file);
    }
  }


  updateTask(): void {
    const formData = new FormData();
    if (this.task.file) {
      formData.append('file', this.task.file, this.task.file.name);
    }
    formData.append('name', this.task.name);
    formData.append('date', this.task.date);
    formData.append('coursename', this.selectedCourseName);

    this.http.put<any>(`http://localhost:8080/api/tasks/${this.task.id}`, formData).subscribe(
      (updatedTask) => {
        console.log('Task updated:', updatedTask);
        // Reset the form or perform other actions
      },
      (error) => {
        console.error('Error updating task:', error);
      }
    );
  }


  downloadTask(taskId: number) {
    const url = `http://localhost:8080/api/tasks/${taskId}/download`;
    this.http.get(url, { responseType: 'blob', observe: 'response' }).subscribe(
      (response: HttpResponse<Blob>) => {
        const responseBody = response.body;
        if (responseBody !== null) {
          const filename = this.getFilenameFromResponse(response);
          this.saveFile(responseBody, filename);
        } else {
          console.error('Empty response body');
        }
      },
      error => {
        console.error(error);
      }
    );
  }

  getFilenameFromResponse(response: HttpResponse<Blob>): string {
    const contentDisposition = response.headers.get('content-disposition');
    const filenameMatch = contentDisposition && contentDisposition.match(/filename="?(.+)"?/);
    return filenameMatch && filenameMatch[1] ? filenameMatch[1] : 'file';
  }

  saveFile(response: Blob, filename: string) {
    const blob = new Blob([response], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }



  // Get the course name based on the courseId
  getCourseName( course_id: number | null | undefined): string {
    if ( course_id === null ||  course_id === undefined) {
      return 'Unknown Course';
    }

    const course = this.courses.find(c => c.id ===  course_id);
    return course ? course.coursNom : 'Unknown Course';
  }


  // Edit a task
  editTask(task: Task): void {
    this.editMode = true;
    this.task = task;
  }

  // Delete a task by id
  deleteTask(taskId: number): void {
    this.taskService.deleteTask(taskId).subscribe(
      () => {
        // Remove the deleted task from the tasks array
        this.tasks = this.tasks.filter((task) => task.id !== taskId);
      },
      (error) => {
        console.error('Error deleting task:', error);
      }
    );
  }
}
