import { Component } from 'san'

export default class MyComponent extends Component {
    static template = `
<div class="todos">
    <a href="#/add" class="todo-add"><i class="fa fa-plus-square"></i></a>
    <ul class="filter-category">
        <li
            san-for="item in categories"
            style="background: {{item.color}}"
        >
            <a href="/todos/category/{{ item.id }}">{{ item.title }}</a>
        </li>
    </ul>

    <ul class="todo-list">
        <li san-for="item, index in todos"
            style="border-color: {{item.category.color}}"
            class="{{item.done ? 'todo-done' : ''}}"
        >
            <h3>{{ item.title }}</h3>
            <p>{{ item.desc }}</p>
            <div class="todo-meta">
                <span san-if="item.category">{{ item.category.title }} | </span>
            </div>
            <a class="fa fa-pencil" href="/edit/{{ item.id }}"></a>
            <i class="fa fa-check" on-click="doneTodo(index)"></i>
            <i class="fa fa-trash-o" on-click="rmTodo(index)"></i>
        </li>
    </ul>
</div>
    `

    doneTodo (index: number) {
        const todo = this.data.get('todos.' + index)
        this.data.set('todos.' + index + '.done', true)
    }

    rmTodo (index: number) {
        const todo = this.data.get('todos.' + index)
        this.data.removeAt('todos', index)
    }
}

const data = {
    todos: [
    ],
    categories: [
        {
            id: 8,
            title: 'category8',
            color: '#c23531'
        },
        {
            id: 7,
            title: 'category7',
            color: '#314656'
        },
        {
            id: 6,
            title: 'category6',
            color: '#dd8668'
        },
        {
            id: 5,
            title: 'category5',
            color: '#91c7ae'
        },
        {
            id: 4,
            title: 'category4',
            color: '#6e7074'
        },
        {
            id: 3,
            title: 'category3',
            color: '#bda29a'
        },
        {
            id: 2,
            title: 'category2',
            color: '#44525d'
        },
        {
            id: 1,
            title: 'category1',
            color: '#c4ccd3'
        }
    ]
}

for (let i = 500; i > 0; i--) {
    data.todos.push({
        id: i,
        title: 'TodoTitle' + i,
        desc: 'Todo Description' + i,
        endTime: 1548149025190,
        category: data.categories[i % 8],
        addTime: 1548062625190,
        done: i === 100
    })
}
